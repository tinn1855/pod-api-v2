import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionInRoleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class RoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ type: [PermissionInRoleDto] })
  permissions: PermissionInRoleDto[];

  @ApiPropertyOptional({ type: Number })
  userCount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RoleListResponseDto {
  @ApiProperty({ type: [RoleResponseDto] })
  data: RoleResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
