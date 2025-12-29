import { IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformDto {
  @ApiPropertyOptional({
    description: 'Platform code (unique identifier, uppercase, e.g., ETSY, AMAZON, SHOPEE)',
    example: 'ETSY',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Code must not be empty' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and underscores',
  })
  code?: string;

  @ApiPropertyOptional({
    description: 'Platform name',
    example: 'Etsy',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name?: string;
}

