import { ApiProperty } from '@nestjs/swagger';
import { UserInfoDto } from './auth-response.dto';

/**
 * Refresh token response
 * Returns accessToken and user info for session restoration
 * Refresh token is automatically set in HttpOnly cookie
 */
export class RefreshResponseDto {
  @ApiProperty({
    description:
      'JWT access token for API authentication. Use this token in Authorization header as Bearer token.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken: string;

  @ApiProperty({
    type: UserInfoDto,
    description: 'User information for session restoration (password is never included)',
  })
  user: UserInfoDto;
}

