import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamQueryDto } from './dto/team-query.dto';
import { TeamResponseDto, TeamListResponseDto } from './dto/team-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('Teams')
@ApiBearerAuth('JWT-auth')
@Controller('teams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Permissions('TEAM_CREATE')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Team name already exists',
  })
  async create(@Body() createTeamDto: CreateTeamDto): Promise<TeamResponseDto> {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  @Permissions('TEAM_READ')
  @ApiOperation({ summary: 'Get list of teams with pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of teams retrieved successfully',
    type: TeamListResponseDto,
  })
  async findAll(@Query() query: TeamQueryDto): Promise<TeamListResponseDto> {
    return this.teamsService.findAll(query);
  }

  @Get(':id')
  @Permissions('TEAM_READ')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiParam({
    name: 'id',
    description: 'Team ID (UUID)',
    example: '926fb2dd-cab5-4390-943a-82c4a39c15ec',
  })
  @ApiResponse({
    status: 200,
    description: 'Team retrieved successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findOne(@Param('id') id: string): Promise<TeamResponseDto> {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('TEAM_UPDATE')
  @ApiOperation({ summary: 'Update team information' })
  @ApiParam({
    name: 'id',
    description: 'Team ID (UUID)',
    example: '926fb2dd-cab5-4390-943a-82c4a39c15ec',
  })
  @ApiResponse({
    status: 200,
    description: 'Team updated successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Team name already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('TEAM_DELETE')
  @ApiOperation({ summary: 'Delete team' })
  @ApiParam({
    name: 'id',
    description: 'Team ID (UUID)',
    example: '926fb2dd-cab5-4390-943a-82c4a39c15ec',
  })
  @ApiResponse({
    status: 200,
    description: 'Team deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Team deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Team has users, cannot delete',
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.teamsService.remove(id);
  }
}
