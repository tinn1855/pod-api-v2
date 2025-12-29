import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlatformDto {
  @ApiProperty({
    description: 'Platform code (unique identifier, uppercase, e.g., ETSY, AMAZON, SHOPEE)',
    example: 'ETSY',
  })
  @IsString()
  @MinLength(1, { message: 'Code must not be empty' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and underscores',
  })
  code: string;

  @ApiProperty({
    description: 'Platform name',
    example: 'Etsy',
  })
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name: string;
}

