import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformDto {
  @ApiPropertyOptional({
    description: 'Platform name (if changed, code will be auto-regenerated)',
    example: 'Etsy',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name?: string;
}

