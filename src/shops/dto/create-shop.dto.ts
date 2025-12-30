import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShopDto {
  @ApiProperty({
    description: 'Shop name',
    example: 'My Etsy Store',
    minLength: 2,
    maxLength: 80,
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(80, { message: 'Name must not exceed 80 characters' })
  name: string;
}

