import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { TempTokenStrategy } from './strategies/temp-token.strategy';
import { ChangePasswordStrategy } from './strategies/change-password.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { PermissionsGuard } from './guards/permissions.guard';
import { ChangePasswordGuard } from './guards/change-password.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'access-token' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '15m';
        return {
          secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    TempTokenStrategy,
    ChangePasswordStrategy,
    RefreshTokenStrategy,
    PermissionsGuard,
    ChangePasswordGuard,
    RefreshTokenGuard,
  ],
  exports: [AuthService, JwtModule, PassportModule, PermissionsGuard],
})
export class AuthModule {}
