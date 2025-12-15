import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description:
      'User email address. Email must be verified (emailVerified=true) before login is allowed.',
    example: 'tinn1855@gmail.com',
    required: true,
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    description:
      'User password. For new users created by admin, this is the temporary password sent via email. For existing users, this is their current password.',
    example: '123123',
    minLength: 6,
    required: true,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
