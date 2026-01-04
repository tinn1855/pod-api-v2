import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SharedServicesModule } from './common/services/shared-services.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { PlatformsModule } from './platforms/platforms.module';
import { ShopsModule } from './shops/shops.module';
import { ContentsModule } from './contents/contents.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SharedServicesModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    RolesModule,
    PermissionsModule,
    ActivityLogsModule,
    PlatformsModule,
    ShopsModule,
    ContentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}