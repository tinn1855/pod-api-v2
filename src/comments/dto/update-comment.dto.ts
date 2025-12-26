import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a comment
 */
export class UpdateCommentDto {
  @ApiPropertyOptional({
    description: 'Comment body/text content. Must not be empty if provided.',
    example: 'Updated comment text',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;
}

