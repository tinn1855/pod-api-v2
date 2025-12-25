import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { SharedServicesModule } from '../../common/services/shared-services.module';

@Module({
  imports: [SharedServicesModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}

