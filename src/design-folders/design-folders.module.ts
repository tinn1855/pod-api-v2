import { Module } from '@nestjs/common';
import { DesignFoldersService } from './design-folders.service';
import { DesignFoldersController } from './design-folders.controller';
import { SharedServicesModule } from '../common/services/shared-services.module';

@Module({
  imports: [SharedServicesModule],
  controllers: [DesignFoldersController],
  providers: [DesignFoldersService],
  exports: [DesignFoldersService],
})
export class DesignFoldersModule {}

