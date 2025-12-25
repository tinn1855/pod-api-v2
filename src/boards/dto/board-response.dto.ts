import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BoardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orgId: string;

  @ApiPropertyOptional({ nullable: true })
  shopId?: string | null;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ nullable: true })
  assigneeDesignerId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  assigneeDesigner?: {
    id: string;
    name: string;
    email: string;
  } | null;

  @ApiPropertyOptional({ nullable: true })
  dueDate?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  priority?: number | null;

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

export class BoardListResponseDto {
  @ApiProperty({ type: [BoardResponseDto] })
  data: BoardResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

