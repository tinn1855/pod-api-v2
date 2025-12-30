import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConnectionDto {
  @ApiPropertyOptional({
    description: 'Display name for the connection',
    example: 'My Updated Etsy Shop',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Display name must not exceed 100 characters' })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Whether the connection is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Region',
    example: 'US',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Region must not exceed 50 characters' })
  region?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Currency must not exceed 10 characters' })
  currency?: string;
}

