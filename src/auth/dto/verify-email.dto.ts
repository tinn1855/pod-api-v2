import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for email verification
 * User provides verification token from email
 */
export class VerifyEmailDto {
  @ApiProperty({
    description:
      'Email verification token received via email. This token is sent to user email when account is created by admin.',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    required: true,
  })
  @IsString()
  @MinLength(1, { message: 'Verification token is required' })
  verificationToken: string;
}
