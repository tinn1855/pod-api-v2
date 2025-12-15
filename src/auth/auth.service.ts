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
import { LoginRequirePasswordChangeDto } from './dto/login-require-password-change.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  JwtPayload,
  TokenType,
} from '../common/interfaces/jwt-payload.interface';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<AuthResponseDto | LoginRequirePasswordChangeDto> {
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

    // Reject login if email is not verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user must change password
    if (user.mustChangePassword) {
      // DO NOT issue access token
      // Issue TEMPORARY token (short-lived, 5-10 minutes) for password change only
      const tempPayload: JwtPayload = {
        sub: user.id,
        roleId: user.roleId,
        teamId: user.teamId || undefined,
        email: user.email,
        type: 'temp',
      };

      const tempTokenExpiresIn =
        this.configService.get<string>('JWT_TEMP_EXPIRES_IN') || '10m';
      const tempToken = this.jwtService.sign(tempPayload as object, {
        expiresIn: tempTokenExpiresIn as any,
      });

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
        requiresPasswordChange: true,
        tempToken,
        message: 'You must change your password before logging in',
        user: userInfo,
      };
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Generate access tokens (normal authenticated user)
    const payload: JwtPayload = {
      sub: user.id,
      roleId: user.roleId,
      teamId: user.teamId || undefined,
      email: user.email,
      type: 'access',
    };

    const accessTokenExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const accessToken = this.jwtService.sign(payload as object, {
      expiresIn: accessTokenExpiresIn as any,
    });

    const refreshTokenExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const refreshToken = this.jwtService.sign(payload as object, {
      expiresIn: refreshTokenExpiresIn as any,
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'your-secret-key',
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

    // Update user: set emailVerified = true, clear token
    // MUST NOT change mustChangePassword here
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        tokenExpiry: null,
      },
    });

    return {
      message:
        'Email verified successfully. Please log in and change your password.',
    };
  }

  /**
   * Unified password change method
   * Supports both:
   * - Forced change (with TEMP token)
   * - Normal change (with ACCESS token)
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        team: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is soft deleted
    if (user.deletedAt !== null) {
      throw new NotFoundException('User not found');
    }

    // Validate password strength
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/;
    if (
      changePasswordDto.newPassword.length < 8 ||
      !passwordRegex.test(changePasswordDto.newPassword)
    ) {
      throw new BadRequestException(
        'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
      );
    }

    // Hash new password using bcrypt
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update user: password, mustChangePassword = false, status = ACTIVE
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        status: UserStatus.ACTIVE,
      },
      include: {
        role: true,
        team: true,
      },
    });

    // Generate access tokens (after successful password change)
    const payload: JwtPayload = {
      sub: updatedUser.id,
      roleId: updatedUser.roleId,
      teamId: updatedUser.teamId || undefined,
      email: updatedUser.email,
      type: 'access',
    };

    const accessTokenExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const accessToken = this.jwtService.sign(payload as object, {
      expiresIn: accessTokenExpiresIn as any,
    });

    const refreshTokenExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const refreshToken = this.jwtService.sign(payload as object, {
      expiresIn: refreshTokenExpiresIn as any,
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        this.configService.get<string>('JWT_SECRET') ||
        'your-secret-key',
    });

    // Prepare user info
    const userInfo: UserInfoDto = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      status: updatedUser.status,
      mustChangePassword: updatedUser.mustChangePassword,
      role: {
        id: updatedUser.role.id,
        name: updatedUser.role.name,
      },
      team: updatedUser.team
        ? {
            id: updatedUser.team.id,
            name: updatedUser.team.name,
          }
        : null,
    };

    return {
      accessToken,
      refreshToken,
      user: userInfo,
    };
  }
}
