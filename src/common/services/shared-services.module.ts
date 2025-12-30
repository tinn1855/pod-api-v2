import { Global, Module } from '@nestjs/common';
import { PositionKeyService } from './position-key.service';
import { FileValidationService } from './file-validation.service';
import { ActivityLogService } from './activity-log.service';
import { EncryptionService } from './encryption.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Shared services module that provides common utilities
 * Marked as Global so it can be imported once and used across all modules
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    PositionKeyService,
    FileValidationService,
    ActivityLogService,
    EncryptionService,
  ],
  exports: [
    PositionKeyService,
    FileValidationService,
    ActivityLogService,
    EncryptionService,
  ],
})
export class SharedServicesModule {}

