import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UserInfoDto {
  @ApiProperty({
    description: 'User unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'tinn1855@gmail.com',
  })
  email: string;

  @ApiProperty({
    enum: UserStatus,
    description: 'User account status',
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiProperty({
    description:
      'Indicates if user must change password before accessing the system',
    example: false,
  })
  mustChangePassword: boolean;

  @ApiProperty({
    description: 'User role information',
    example: { id: '123e4567-e89b-12d3-a456-426614174001', name: 'ADMIN' },
  })
  role: {
    id: string;
    name: string;
  };

  @ApiProperty({
    nullable: true,
    description: 'User team information (optional)',
    example: { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Sales Team' },
  })
  team?: {
    id: string;
    name: string;
  } | null;
}

export class AuthResponseDto {
  @ApiProperty({
    description:
      'JWT access token for API authentication. Use this token in Authorization header as Bearer token.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'JWT refresh token for obtaining new access tokens when access token expires',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  refreshToken: string;

  @ApiProperty({
    type: UserInfoDto,
    description: 'User information (password is never included)',
  })
  user: UserInfoDto;
}
