import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';

export class ContentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orgId: string;

  @ApiProperty()
  boardId: string;

  @ApiProperty()
  shopId: string;

  @ApiPropertyOptional({ nullable: true })
  accountId?: string | null;

  @ApiProperty({ enum: ContentStatus })
  status: ContentStatus;

  @ApiPropertyOptional({ nullable: true })
  title?: string | null;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  meta?: unknown;

  @ApiPropertyOptional({ nullable: true })
  tags?: unknown;

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

  @ApiProperty()
  updatedAt: Date;
}

export class ContentListResponseDto {
  @ApiProperty({ type: [ContentResponseDto] })
  data: ContentResponseDto[];
}

