import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

/**
 * Custom extractor to get refresh token from request body
 */
const extractRefreshTokenFromBody = (req: Request): string | null => {
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }
  return null;
};

/**
 * Strategy for validating refresh tokens
 * Uses JWT_REFRESH_SECRET to verify refresh tokens
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: extractRefreshTokenFromBody,
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'your-secret-key',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.roleId) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    // Refresh tokens should have type 'access' (they were created for access tokens)
    // But we accept any valid token here since refresh token is used to get new access token
    return {
      ...payload,
      type: payload.type || 'access',
    };
  }
}

