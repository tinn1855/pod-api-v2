import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserInfoDto } from './dto/auth-response.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        role: true,
        team: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is soft deleted
    if (user.deletedAt !== null) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      roleId: user.roleId,
      teamId: user.teamId || undefined,
      email: user.email,
    };

    const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const accessToken = this.jwtService.sign(payload as object, {
      expiresIn: accessTokenExpiresIn as any,
    });

    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const refreshToken = this.jwtService.sign(payload as object, {
      expiresIn: refreshTokenExpiresIn as any,
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });

    // Prepare user info (without password)
    const userInfo: UserInfoDto = {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      role: {
        id: user.role.id,
        name: user.role.name,
      },
      team: user.team
        ? {
            id: user.team.id,
            name: user.team.name,
          }
        : null,
    };

    return {
      accessToken,
      refreshToken,
      user: userInfo,
    };
  }

  async logout(): Promise<{ message: string }> {
    // Stateless logout - client will delete tokens
    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired verification token');
    }

    // Check if token is expired
    if (user.tokenExpiry && user.tokenExpiry < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Update user: set emailVerified = true, status = ACTIVE, clear token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
        verificationToken: null,
        tokenExpiry: null,
      },
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }
}
