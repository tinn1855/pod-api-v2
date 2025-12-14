import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleInPermissionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class PermissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: [RoleInPermissionDto] })
  roles: RoleInPermissionDto[];

  @ApiPropertyOptional({ type: Number })
  roleCount?: number;
}

export class PermissionListResponseDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  data: PermissionResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
