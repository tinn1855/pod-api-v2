import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FolderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orgId: string;

  @ApiProperty()
  boardId: string;

  @ApiPropertyOptional({ nullable: true })
  parentId?: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  createdBy: {
    id: string;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({ type: Number })
  childrenCount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class FolderListResponseDto {
  @ApiProperty({ type: [FolderResponseDto] })
  data: FolderResponseDto[];
}

