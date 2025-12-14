import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Role name',
    example: 'Manager Updated',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Updated role description',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
