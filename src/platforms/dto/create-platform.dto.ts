import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlatformDto {
  @ApiProperty({
    description: 'Platform name (code will be auto-generated from name)',
    example: 'Etsy',
  })
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name: string;
}

