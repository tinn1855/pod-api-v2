import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name',
    example: 'Manager',
  })
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Manager role with shop and product management permissions',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
