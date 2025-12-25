import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityType, FilePurpose } from '@prisma/client';

export class AttachmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orgId: string;

  @ApiProperty({ enum: EntityType })
  entityType: EntityType;

  @ApiProperty()
  entityId: string;

  @ApiProperty()
  fileId: string;

  @ApiProperty({ enum: FilePurpose })
  purpose: FilePurpose;

  @ApiProperty()
  file: {
    id: string;
    originalName: string;
    fileType: string;
    extension: string;
    size: string;
    storageKey: string;
  };

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  createdBy: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty()
  createdAt: Date;
}

export class AttachmentListResponseDto {
  @ApiProperty({ type: [AttachmentResponseDto] })
  data: AttachmentResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

