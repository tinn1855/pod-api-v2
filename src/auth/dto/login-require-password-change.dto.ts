import { ApiProperty } from '@nestjs/swagger';
import { UserInfoDto } from './auth-response.dto';

/**
 * Response DTO when login requires password change
 * Returns TEMP token instead of access token
 */
export class LoginRequirePasswordChangeDto {
  @ApiProperty({
    description:
      'Indicates that password change is required. Temporary token is issued instead of access token.',
    example: true,
  })
  requiresPasswordChange: boolean;

  @ApiProperty({
    description:
      'Temporary JWT token (short-lived, 5-10 minutes) for password change only. Use this token in Authorization header as Bearer token when calling POST /auth/change-password endpoint. This token can ONLY be used for password change, not for other API endpoints.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ODVhOWExMS00NTcxLTQ5ZjEtYTllYi05MjdiNDRmODQ2OTkiLCJyb2xlSWQiOiI5MjZmYjJkZC1jYWI1LTQzOTAtOTQzYS04MmM0YTM5YzE1ZWMiLCJlbWFpbCI6ImpvaG4uZG9lMjIyMkBleGFtcGxlLmNvbSIsInR5cGUiOiJ0ZW1wIiwiaWF0IjoxNzY1Nzc3ODkzLCJleHAiOjE3NjU3Nzg0OTN9.P8AbehIMl2g1XCaPlouieRDIGu_rOK39wLxlKsgAvWg',
  })
  tempToken: string;

  @ApiProperty({
    description: 'Message explaining the requirement',
    example: 'You must change your password before logging in',
  })
  message: string;

  @ApiProperty({
    type: UserInfoDto,
    description: 'User information',
  })
  user: UserInfoDto;
}
