import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopConnectionResponseDto } from '../../connections/dto/connection-response.dto';

export class ShopResponseDto {
  @ApiProperty({ description: 'Shop ID', example: 'shop-uuid' })
  id: string;

  @ApiProperty({ description: 'Organization ID', example: 'org-uuid' })
  orgId: string;

  @ApiProperty({ description: 'Owner user ID', example: 'user-uuid' })
  ownerUserId: string;

  @ApiProperty({ description: 'Shop name', example: 'My Etsy Store' })
  name: string;

  @ApiProperty({ description: 'Whether the shop is active', example: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Shop connections',
    type: [ShopConnectionResponseDto],
    required: false,
  })
  connections?: ShopConnectionResponseDto[];
}

export class ShopListResponseDto {
  @ApiProperty({ type: [ShopResponseDto] })
  data: ShopResponseDto[];

  @ApiProperty({ description: 'Total count', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;
}

