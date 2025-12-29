import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for refresh token endpoint
 * Validates refresh token from request body
 */
@Injectable()
export class RefreshTokenGuard extends AuthGuard('refresh-token') {}

