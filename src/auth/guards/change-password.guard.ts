import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt } from 'passport-jwt';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

/**
 * Guard that accepts BOTH access tokens and temporary tokens
 * Used specifically for /auth/change-password endpoint
 * Custom implementation to properly handle both token types
 */
@Injectable()
export class ChangePasswordGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // This endpoint requires token (either temp or access)
    // We use @Public() to bypass global guard, but still require token validation here
    const request = context.switchToHttp().getRequest();
    
    // Try multiple ways to extract token
    let token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    
    // Fallback: try to get from Authorization header directly
    if (!token && request.headers?.authorization) {
      const authHeader = request.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('Token is required. Please provide token in Authorization header as Bearer token.');
    }

    try {
      // Verify token using JwtService
      // JwtService will use secret from JwtModule config (same as used for signing)
      // This ensures consistency between signing and verification
      const payload = this.jwtService.verify(token) as JwtPayload;

      // Validate payload structure
      if (!payload.sub || !payload.roleId) {
        throw new UnauthorizedException('Invalid token payload: missing required fields (sub or roleId)');
      }

      // Accept both 'access' and 'temp' token types
      // If type is not specified, default to 'access' for backward compatibility
      if (payload.type && payload.type !== 'access' && payload.type !== 'temp') {
        throw new UnauthorizedException(`Invalid token type: ${payload.type}. Expected 'access' or 'temp'.`);
      }

      // Ensure type is set (default to 'access' if not specified)
      payload.type = payload.type || 'access';

      // Attach user to request
      request.user = payload;
      return true;
    } catch (error: any) {
      // Provide more specific error messages
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired. Please login again or use a valid token.');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(`Invalid token: ${error.message || 'Token format is invalid'}`);
      }
      if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not active yet');
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log unexpected errors for debugging
      console.error('Token validation error:', error);
      throw new UnauthorizedException(`Token validation failed: ${error.message || 'Unknown error'}`);
    }
  }
}
