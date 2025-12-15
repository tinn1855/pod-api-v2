import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

/**
 * Strategy for validating temporary tokens (password-change-only)
 * Accepts only tokens with type: 'temp'
 */
@Injectable()
export class TempTokenStrategy extends PassportStrategy(
  Strategy,
  'temp-token',
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

    // Only accept temporary tokens
    if (payload.type !== 'temp') {
      throw new UnauthorizedException(
        'This endpoint requires a temporary password-change token',
      );
    }

    return payload;
  }
}
