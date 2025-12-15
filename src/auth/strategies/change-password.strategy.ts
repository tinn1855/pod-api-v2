import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

/**
 * Strategy for change-password endpoint
 * Accepts BOTH access tokens and temporary tokens
 */
@Injectable()
export class ChangePasswordStrategy extends PassportStrategy(
  Strategy,
  'change-password-token',
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

    // Accept both 'access' and 'temp' token types
    if (payload.type && payload.type !== 'access' && payload.type !== 'temp') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Ensure type is set (default to 'access' if not specified)
    return {
      ...payload,
      type: payload.type || 'access',
    };
  }
}

