import {
  IsEmail,
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmailUnique } from '../../common/validators/is-email-unique.validator';

/**
 * DTO for creating a user
 * System automatically generates password and sends it via email
 * Admin provides ONLY: name, email, roleId, teamId
 * Password is NEVER provided by admin - system generates it
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 1,
    required: true,
  })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @ApiProperty({
    description:
      'User email address. Must be unique. Verification email with temporary password will be sent to this address. System automatically generates password - admin does NOT provide password.',
    example: 'john.doe@example.com',
    required: true,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsEmailUnique({ message: 'Email already exists' })
  email: string;

  @ApiProperty({
    description: 'Role ID (UUID). User will be assigned this role.',
    example: '926fb2dd-cab5-4390-943a-82c4a39c15ec',
    required: true,
  })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({
    description:
      'Team ID (UUID) - optional. User will be assigned to this team if provided.',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  teamId?: string;
}
