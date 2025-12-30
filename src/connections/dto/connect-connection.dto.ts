import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectConnectionDto {
  @ApiProperty({
    description: 'OAuth access token',
    example: 'access-token-12345',
  })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({
    description: 'OAuth refresh token',
    example: 'refresh-token-12345',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Token expiration date (ISO string)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'OAuth scopes',
    example: ['read_products', 'write_products'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { storeId: '12345' },
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}

