import { IsEnum, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopPlatform } from '@prisma/client';

export class CreateConnectionDto {
  @ApiProperty({
    description: 'Platform type',
    enum: ShopPlatform,
    example: ShopPlatform.ETSY,
  })
  @IsEnum(ShopPlatform, { message: 'Invalid platform' })
  platform: ShopPlatform;

  @ApiPropertyOptional({
    description: 'Display name for the connection',
    example: 'My Etsy Shop',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Display name must not exceed 100 characters' })
  displayName?: string;

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

