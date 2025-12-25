import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileType } from '@prisma/client';

export class FileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orgId: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty({ enum: FileType })
  fileType: FileType;

  @ApiProperty()
  extension: string;

  @ApiPropertyOptional({ nullable: true })
  mimeType?: string | null;

  @ApiProperty()
  size: string; // BigInt as string

  @ApiProperty()
  storageKey: string;

  @ApiPropertyOptional({ nullable: true })
  checksum?: string | null;

  @ApiProperty()
  uploadedById: string;

  @ApiProperty()
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty()
  createdAt: Date;
}

export class CreateFileResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({
    description: 'Upload URL (stub - returns null for now)',
    nullable: true,
  })
  uploadUrl?: string | null;
}

