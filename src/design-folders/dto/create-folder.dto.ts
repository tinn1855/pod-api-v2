import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a design folder
 */
export class CreateFolderDto {
  @ApiProperty({
    description: 'Folder name',
    example: 'Q1 Designs',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name: string;

  @ApiPropertyOptional({
    description: 'Parent folder ID (UUID). If not provided, folder is created at root level',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

