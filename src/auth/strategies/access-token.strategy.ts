import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import {
  JwtPayload,
  TokenType,
} from '../../common/interfaces/jwt-payload.interface';

/**
 * Strategy for validating access tokens (normal authenticated users)
 * Rejects temporary tokens (type: 'temp')
 */
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'access-token',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.roleId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Reject temporary tokens - only accept access tokens
    if (payload.type === 'temp') {
      throw new UnauthorizedException(
        'Temporary token not allowed for this endpoint',
      );
    }

    // Ensure type is 'access' (default for backward compatibility)
    return {
      ...payload,
      type: payload.type || 'access',
    };
  }
}
