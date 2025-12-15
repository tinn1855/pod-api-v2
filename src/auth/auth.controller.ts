import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginRequirePasswordChangeDto } from './dto/login-require-password-change.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { AccessTokenGuard } from './guards/access-token.guard';
import { ChangePasswordGuard } from './guards/change-password.guard';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Login with email and password. System validates credentials and checks email verification status. If user has mustChangePassword=true, returns requiresPasswordChange response with temporary token (short-lived, 5-10 minutes) for password change only. If mustChangePassword=false, returns normal access token and refresh token. Login is rejected if emailVerified=false.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful - returns access token, refresh token, and user info. This response is returned when mustChangePassword=false.',
    type: AuthResponseDto,
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
  ): Promise<AuthResponseDto | LoginRequirePasswordChangeDto> {
    return this.authService.login(loginDto);
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
  ): Promise<AuthResponseDto> {
    return this.authService.changePassword(
      req.user.sub,
      changePasswordDto,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Logged out successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing access token',
  })
  async logout(): Promise<{ message: string }> {
    return this.authService.logout();
  }
}