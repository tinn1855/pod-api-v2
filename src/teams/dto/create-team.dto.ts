import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({
    description: 'Team name',
    example: 'Design Team',
  })
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name: string;
}
