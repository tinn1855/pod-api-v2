import { IsOptional, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UserQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Filter by role ID',
    example: '926fb2dd-cab5-4390-943a-82c4a39c15ec',
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Filter by team ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
