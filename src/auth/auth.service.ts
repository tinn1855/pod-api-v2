import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserInfoDto } from './dto/auth-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginRequirePasswordChangeDto } from './dto/login-require-password-change.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  JwtPayload,
  TokenType,
} from '../common/interfaces/jwt-payload.interface';
import { UserStatus } from '@prisma/client';
import {
  generateRefreshToken,
  hashValidator,
  parseRefreshToken,
  verifyValidator,
} from './utils/refresh-token.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ip?: string,
  ): Promise<
    | LoginResponseDto
    | LoginRequirePasswordChangeDto
    | { response: LoginResponseDto; refreshToken: string }
  > {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        org: true,
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
        orgId: user.orgId,
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
        org: {
          id: user.org.id,
          name: user.org.name,
        },
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

    // Generate access token (normal authenticated user)
    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.orgId,
      roleId: user.roleId,
      teamId: user.teamId || undefined,
      email: user.email,
      type: 'access',
    };

    const accessTokenExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '10m';
    const accessToken = this.jwtService.sign(payload as object, {
      expiresIn: accessTokenExpiresIn as any,
    });

    // Generate opaque refresh token and create session
    const { token: refreshToken, selector, validator } = generateRefreshToken();
    const validatorHash = await hashValidator(validator);

    // Calculate expiration (default 7 days)
    const refreshTokenTtlDays =
      parseInt(
        this.configService.get<string>('REFRESH_TTL_DAYS') || '7',
        10,
      ) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenTtlDays);

    // Create refresh session in database
    const familyId = crypto.randomUUID();
    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        selector,
        validatorHash,
        familyId,
        expiresAt,
        userAgent: userAgent || null,
        ip: ip || null,
      },
    });

    // Prepare user info (without password)
    const userInfo: UserInfoDto = {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      org: {
        id: user.org.id,
        name: user.org.name,
      },
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

    // Return response with refreshToken (controller will set cookie and remove from response)
    return {
      response: {
        accessToken,
        user: userInfo,
      },
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token from cookie
   * Implements rotation and reuse detection
   * Returns accessToken, new refreshToken, and user info for session restoration
   */
  async refreshAccessToken(
    refreshToken: string,
    userAgent?: string,
    ip?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserInfoDto }> {
    // Parse token
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const { selector, validator } = parsed;

    // Find session by selector with user relations
    const session = await this.prisma.refreshSession.findUnique({
      where: { selector },
      include: {
        user: {
          include: {
            org: true,
            role: true,
            team: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if session is revoked
    if (session.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Verify validator hash - REUSE DETECTION
    const isValid = await verifyValidator(validator, session.validatorHash);
    if (!isValid) {
      // Token reuse detected - revoke entire family
      await this.prisma.refreshSession.updateMany({
        where: {
          familyId: session.familyId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if user still exists and is active
    if (!session.user || session.user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    if (session.user.mustChangePassword) {
      throw new UnauthorizedException(
        'You must change your password before accessing the system',
      );
    }

    // ROTATION: Create new session and revoke old one (transaction)
    const { token: newRefreshToken, selector: newSelector, validator: newValidator } =
      generateRefreshToken();
    const newValidatorHash = await hashValidator(newValidator);

    const refreshTokenTtlDays =
      parseInt(
        this.configService.get<string>('REFRESH_TTL_DAYS') || '7',
        10,
      ) || 7;
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + refreshTokenTtlDays);

    // Use transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      // Create new session
      const newSession = await tx.refreshSession.create({
        data: {
          userId: session.userId,
          selector: newSelector,
          validatorHash: newValidatorHash,
          familyId: session.familyId, // Same family
          expiresAt: newExpiresAt,
          userAgent: userAgent || null,
          ip: ip || null,
        },
      });

      // Revoke old session and link to new one
      await tx.refreshSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedById: newSession.id,
        },
      });
    });

    // Generate new access token
    const payload: JwtPayload = {
      sub: session.userId,
      orgId: session.user.orgId,
      roleId: session.user.roleId,
      teamId: session.user.teamId || undefined,
      email: session.user.email,
      type: 'access',
    };

    const accessTokenExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '10m';
    const accessToken = this.jwtService.sign(payload as object, {
      expiresIn: accessTokenExpiresIn as any,
    });

    // Prepare user info for session restoration
    const userInfo: UserInfoDto = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      status: session.user.status,
      mustChangePassword: session.user.mustChangePassword,
      org: {
        id: session.user.org.id,
        name: session.user.org.name,
      },
      role: {
        id: session.user.role.id,
        name: session.user.role.name,
      },
      team: session.user.team
        ? {
            id: session.user.team.id,
            name: session.user.team.name,
          }
        : null,
    };

    // Return accessToken, newRefreshToken, and user info (controller will set cookie)
    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: userInfo,
    };
  }

  /**
   * Revoke refresh session (logout)
   */
  async revokeRefreshSession(refreshToken: string): Promise<void> {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) {
      // Invalid format, but don't throw - just return (idempotent)
      return;
    }

    const { selector } = parsed;

    // Find and revoke session
    await this.prisma.refreshSession.updateMany({
      where: {
        selector,
        revokedAt: null, // Only revoke if not already revoked
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async logout(): Promise<{ message: string }> {
    // Stateless logout - client will delete tokens
    return { message: 'Logged out successfully' };
  }


  /**
   * Email verification with token expiration check (60 minutes)
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    // Find user by verification token
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: token,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if token has expired (60 minutes from creation)
    if (
      !user.verificationTokenExpiresAt ||
      new Date() > user.verificationTokenExpiresAt
    ) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new verification email.',
      );
    }

    // Check if already verified (status is ACTIVE)
    if (user.status === UserStatus.ACTIVE) {
      return {
        message: 'Email already verified. You can now login.',
      };
    }

    // Verify user: set status to ACTIVE and clear verification token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });

    return {
      message:
        'Email verified successfully. You can now login with your temporary password.',
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
  ): Promise<{ response: LoginResponseDto; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        org: true,
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
        org: true,
        role: true,
        team: true,
      },
    });

    // Generate access tokens (after successful password change)
    const payload: JwtPayload = {
      sub: updatedUser.id,
      orgId: updatedUser.orgId,
      roleId: updatedUser.roleId,
      teamId: updatedUser.teamId || undefined,
      email: updatedUser.email,
      type: 'access',
    };

    const accessTokenExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') || '10m';
    const accessToken = this.jwtService.sign(payload as object, {
      expiresIn: accessTokenExpiresIn as any,
    });

    // Generate opaque refresh token and create session (same as login)
    const { token: refreshToken, selector, validator } = generateRefreshToken();
    const validatorHash = await hashValidator(validator);

    const refreshTokenTtlDays =
      parseInt(
        this.configService.get<string>('REFRESH_TTL_DAYS') || '7',
        10,
      ) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenTtlDays);

    const familyId = crypto.randomUUID();
    await this.prisma.refreshSession.create({
      data: {
        userId: updatedUser.id,
        selector,
        validatorHash,
        familyId,
        expiresAt,
      },
    });

    // Prepare user info
    const userInfo: UserInfoDto = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      status: updatedUser.status,
      mustChangePassword: updatedUser.mustChangePassword,
      org: {
        id: updatedUser.org.id,
        name: updatedUser.org.name,
      },
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

    // Return response with refreshToken (controller will set cookie)
    return {
      response: {
        accessToken,
        user: userInfo,
      },
      refreshToken,
    };
  }
}
