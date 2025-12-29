import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlatformResponseDto {
  @ApiProperty({
    description: 'Platform unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Platform code (unique, uppercase)',
    example: 'ETSY',
  })
  code: string;

  @ApiProperty({
    description: 'Platform name',
    example: 'Etsy',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Number of accounts using this platform',
    type: Number,
  })
  accountCount?: number;

  @ApiProperty({
    description: 'Platform creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Platform last update timestamp',
  })
  updatedAt: Date;
}

export class PlatformListResponseDto {
  @ApiProperty({ type: [PlatformResponseDto] })
  data: PlatformResponseDto[];

  @ApiProperty({
    description: 'Total number of platforms',
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
  })
  totalPages: number;
}

