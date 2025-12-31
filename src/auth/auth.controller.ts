import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request as ExpressRequest, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginRequirePasswordChangeDto } from './dto/login-require-password-change.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshResponseDto } from './dto/refresh-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { ChangePasswordGuard } from './guards/change-password.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Login with email and password. System validates credentials and checks email verification status. If user has mustChangePassword=true, returns requiresPasswordChange response with temporary token (short-lived, 5-10 minutes) for password change only. If mustChangePassword=false, returns access token in JSON and sets refresh token in HttpOnly cookie. Login is rejected if emailVerified=false.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful - returns access token (short-lived, ~10 minutes) and user info. Access token should be stored in-memory by frontend. Refresh token is automatically set in HttpOnly + Secure + SameSite cookie named "refresh_token" (frontend should NOT store this - browser manages it automatically). This response is returned when mustChangePassword=false.',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 200,
    description:
      'Password change required - returns temporary token for password change. This response is returned when mustChangePassword=true. Access token is NOT issued. Use the tempToken with /auth/change-password endpoint.',
    type: LoginRequirePasswordChangeDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid credentials, email not verified (emailVerified=false), or account not active',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto | LoginRequirePasswordChangeDto> {
    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined;
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for']
        : Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : undefined) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    const result = await this.authService.login(loginDto, userAgent, ip);

    // If password change required, return as-is
    if ('requiresPasswordChange' in result) {
      return result;
    }

    // Extract refreshToken and set cookie
    if ('refreshToken' in result && 'response' in result) {
      const { refreshToken, response } = result as {
        refreshToken: string;
        response: LoginResponseDto;
      };
      this.setRefreshTokenCookie(res, refreshToken);
      return response;
    }

    return result;
  }

  /**
   * Set refresh token as HttpOnly cookie
   * In dev mode (NODE_ENV !== 'production'): sameSite='none', secure=true (required for cross-site cookies)
   * In production: auto-detect cross-site or use COOKIE_SAMESITE and COOKIE_SECURE from env
   */
  private setRefreshTokenCookie(res: Response, token: string): void {
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    const refreshTtlDays =
      parseInt(this.configService.get<string>('REFRESH_TTL_DAYS') || '7', 10) ||
      7;
    const maxAge = refreshTtlDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    // Check if frontend and backend are on different domains (cross-site)
    const frontendOrigin = this.configService.get<string>('FRONTEND_ORIGIN');
    const isCrossSite =
      frontendOrigin &&
      !frontendOrigin.includes('localhost') &&
      !frontendOrigin.includes('127.0.0.1');

    // Dev mode OR cross-site production: sameSite='none' and secure=true
    // Same-site production: use env vars (default: sameSite='lax', secure=true)
    const cookieSecure =
      isDev || isCrossSite
        ? true
        : this.configService.get<string>('COOKIE_SECURE') !== 'false';
    const cookieSameSite =
      isDev || isCrossSite
        ? ('none' as const)
        : (this.configService.get<string>('COOKIE_SAMESITE') as
            | 'strict'
            | 'lax'
            | 'none') || 'lax';

    res.cookie('refresh_token', token, {
      httpOnly: true, // JavaScript cannot access
      secure: cookieSecure, // Required for sameSite='none' (cross-site)
      sameSite: cookieSameSite, // 'none' for cross-site, 'lax' for same-site
      path: '/', // Available for all paths (but only used by /auth/refresh)
      maxAge,
    });
  }

  /**
   * Clear refresh token cookie
   * Must use same secure/sameSite/path as setRefreshTokenCookie
   */
  private clearRefreshTokenCookie(res: Response): void {
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    // Check if frontend and backend are on different domains (cross-site)
    const frontendOrigin = this.configService.get<string>('FRONTEND_ORIGIN');
    const isCrossSite =
      frontendOrigin &&
      !frontendOrigin.includes('localhost') &&
      !frontendOrigin.includes('127.0.0.1');

    // Dev mode OR cross-site production: sameSite='none' and secure=true
    // Same-site production: use env vars (default: sameSite='lax', secure=true)
    const cookieSecure =
      isDev || isCrossSite
        ? true
        : this.configService.get<string>('COOKIE_SECURE') !== 'false';
    const cookieSameSite =
      isDev || isCrossSite
        ? ('none' as const)
        : (this.configService.get<string>('COOKIE_SAMESITE') as
            | 'strict'
            | 'lax'
            | 'none') || 'lax';

    res.clearCookie('refresh_token', {
      path: '/', // Must match the path used when setting cookie
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
    });
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address with token',
    description:
      'Verify user email using the token sent via email. Sets emailVerified=true but does NOT change mustChangePassword.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Email verified successfully. Please log in and change your password.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Token expired or email already verified',
  })
  @ApiResponse({ status: 404, description: 'Invalid verification token' })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(verifyEmailDto.verificationToken);
  }

  @Public()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ChangePasswordGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password (unified endpoint)',
    description:
      'Unified endpoint for password change. Accepts both TEMP token (from login when mustChangePassword=true) and ACCESS token (authenticated user). Token must be provided in Authorization header as Bearer token. On success, sets mustChangePassword=false, status=ACTIVE, and issues new access token and refresh token. Password must meet strength requirements: minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character. IMPORTANT: This endpoint does NOT require oldPassword - only newPassword is needed in request body. Authentication is done via JWT token in Authorization header.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Password changed successfully. Returns new access token, refresh token, and updated user info. After this, user can use the new access token for authenticated requests.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid password format, password does not meet strength requirements (must be at least 8 characters with uppercase, lowercase, number, and special character), or unexpected fields in request body (e.g., oldPassword is not allowed)',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid or missing token. Token must be either TEMP token (from login when mustChangePassword=true) or ACCESS token (authenticated user). Token must be provided in Authorization header as Bearer token.',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: { user: JwtPayload },
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.changePassword(
      req.user.sub,
      changePasswordDto,
    );

    // If result has refreshToken, set cookie
    if ('refreshToken' in result && 'response' in result) {
      const { refreshToken, response } = result as {
        refreshToken: string;
        response: LoginResponseDto;
      };
      this.setRefreshTokenCookie(res, refreshToken);
      return response;
    }

    // Fallback (shouldn't happen with new implementation)
    return result as LoginResponseDto;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Refresh access token using refresh token from HttpOnly cookie. **No request body needed** - the refresh token is automatically sent by the browser in the `refresh_token` cookie (set during login). This endpoint: (1) reads refresh token from cookie, (2) verifies token and checks DB session, (3) rotates refresh token (issues new token, revokes old one), (4) sets new refresh token cookie, (5) returns new access token. If token reuse is detected, all sessions in the family are revoked.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Access token refreshed successfully. New refresh token is set in HttpOnly cookie. Returns accessToken and user info for session restoration.',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid, expired, missing, or reused refresh token. Also returned if user account is not active or user must change password.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async refresh(
    @Request() req: ExpressRequest & { cookies?: { refresh_token?: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      // Debug logging for cookie issues
      console.warn('Refresh token not found in cookies', {
        cookiesReceived: req.cookies,
        hasCookies: !!req.cookies,
        requestOrigin: req.headers.origin,
        requestReferer: req.headers.referer,
        cookieHeader: req.headers.cookie,
      });
      throw new UnauthorizedException('Refresh token not found');
    }

    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined;
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for']
        : Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : undefined) ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';

    const result = await this.authService.refreshAccessToken(
      refreshToken,
      userAgent,
      ip,
    );

    // Set new refresh token cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    // Return accessToken and user info for session restoration
    const { accessToken, user } = result;
    const response: RefreshResponseDto = {
      accessToken,
      user: user as RefreshResponseDto['user'],
    };
    return response;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description:
      'Logout user by revoking refresh token session in DB and clearing refresh token cookie. This endpoint does not require authentication (can be called with or without access token). After logout, refresh token cannot be used anymore.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Logout successful - refresh session revoked and cookie cleared',
    schema: {
      type: 'object',
      properties: {
        ok: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  async logout(
    @Request() req: ExpressRequest & { cookies?: { refresh_token?: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean }> {
    const refreshToken = req.cookies?.refresh_token;

    if (refreshToken) {
      await this.authService.revokeRefreshSession(refreshToken);
    }

    // Clear cookie
    this.clearRefreshTokenCookie(res);

    return { ok: true };
  }
}
