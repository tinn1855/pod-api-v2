import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for refresh token request
 * User provides refresh token to get new access token
 */
export class RefreshTokenDto {
  @ApiProperty({
    description:
      'JWT refresh token received from login or change-password endpoint. This token is used to obtain a new access token when the current access token expires.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    required: true,
  })
  @IsString()
  @MinLength(1, { message: 'Refresh token is required' })
  refreshToken: string;
}

