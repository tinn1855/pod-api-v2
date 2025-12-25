import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a design folder
 */
export class UpdateFolderDto {
  @ApiPropertyOptional({
    description: 'Folder name',
    example: 'Updated Folder Name',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Parent folder ID (UUID). Set to null to move to root level',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.parentId !== null)
  @IsUUID()
  parentId?: string | null;
}

