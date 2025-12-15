import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeamDto {
  @ApiPropertyOptional({
    description: 'Team name',
    example: 'Design Team Updated',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name?: string;
}
