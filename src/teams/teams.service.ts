import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamQueryDto } from './dto/team-query.dto';
import {
  TeamResponseDto,
  TeamListResponseDto,
} from './dto/team-response.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async create(createTeamDto: CreateTeamDto): Promise<TeamResponseDto> {
    // Check if team name already exists
    const existingTeam = await this.prisma.team.findFirst({
      where: { name: createTeamDto.name },
    });

    if (existingTeam) {
      throw new ConflictException('Team name already exists');
    }

    const team = await this.prisma.team.create({
      data: {
        name: createTeamDto.name,
      },
    });

    return this.mapToTeamResponse(team);
  }

  async findAll(query: TeamQueryDto): Promise<TeamListResponseDto> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        skip,
        take: limit,
        include: {
          _count: {
            select: { users: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.team.count(),
    ]);

    return {
      data: teams.map((team) => this.mapToTeamResponse(team)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<TeamResponseDto> {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.mapToTeamResponse(team);
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<TeamResponseDto> {
    const existingTeam = await this.prisma.team.findUnique({
      where: { id },
    });

    if (!existingTeam) {
      throw new NotFoundException('Team not found');
    }

    // Check if new name conflicts with existing team
    if (updateTeamDto.name && updateTeamDto.name !== existingTeam.name) {
      const conflictingTeam = await this.prisma.team.findFirst({
        where: {
          name: updateTeamDto.name,
          NOT: { id },
        },
      });

      if (conflictingTeam) {
        throw new ConflictException('Team name already exists');
      }
    }

    const team = await this.prisma.team.update({
      where: { id },
      data: updateTeamDto,
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return this.mapToTeamResponse(team);
  }

  async remove(id: string): Promise<{ message: string }> {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check if team has users
    if (team._count.users > 0) {
      throw new ConflictException(
        `Cannot delete team. Team has ${team._count.users} user(s). Please reassign users first.`,
      );
    }

    await this.prisma.team.delete({
      where: { id },
    });

    return { message: 'Team deleted successfully' };
  }

  private mapToTeamResponse(team: any): TeamResponseDto {
    return {
      id: team.id,
      name: team.name,
      userCount: team._count?.users || 0,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }
}
