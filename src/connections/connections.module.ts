import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { PlatformAdapterService } from './adapters/platform-adapter.service';
import { SharedServicesModule } from '../common/services/shared-services.module';

@Module({
  imports: [SharedServicesModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService, PlatformAdapterService],
  exports: [ConnectionsService, PlatformAdapterService],
})
export class ConnectionsModule {}

