import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for changing password via /auth/change-password endpoint
 * Used for both forced change (with TEMP token) and normal change (with ACCESS token)
 * NOTE: This endpoint does NOT require oldPassword - authentication is done via JWT token in Authorization header
 */
export class ChangePasswordDto {
  @ApiProperty({
    description:
      'New password. Must be at least 8 characters and contain: uppercase letter, lowercase letter, number, and special character (!@#$%^&*(),.?":{}|<>)',
    example: 'NewPassword123!',
    minLength: 8,
    required: true,
    type: String,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}
