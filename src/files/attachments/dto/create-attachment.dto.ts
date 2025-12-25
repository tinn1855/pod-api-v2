import { IsEnum, IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EntityType, FilePurpose } from '@prisma/client';

/**
 * DTO for creating an attachment (EntityFile)
 */
export class CreateAttachmentDto {
  @ApiProperty({
    description: 'Type of entity this file is attached to',
    enum: EntityType,
    example: EntityType.DESIGN,
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    description: 'ID of the entity this file is attached to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'File ID to attach',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  fileId: string;

  @ApiProperty({
    description: 'Purpose of this attachment',
    enum: FilePurpose,
    example: FilePurpose.DESIGN_SOURCE,
  })
  @IsEnum(FilePurpose)
  purpose: FilePurpose;
}

