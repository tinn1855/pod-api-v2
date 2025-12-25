import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto, UserListResponseDto } from './dto/user-response.dto';
import { EmailService } from '../common/services/email.service';
import { UserStatus, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { id: createUserDto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if trying to create Super Admin
    if (role.name === 'SUPER_ADMIN') {
      // Check if Super Admin already exists
      const existingSuperAdmin = await this.prisma.user.findFirst({
        where: {
          role: {
            name: 'SUPER_ADMIN',
          },
          deletedAt: null, // Only count non-deleted users
        },
      });

      // If Super Admin already exists, prevent creating another one
      if (existingSuperAdmin) {
        throw new BadRequestException(
          'Super Admin already exists. Only one Super Admin is allowed in the system.',
        );
      }
      // If no Super Admin exists, allow creation
    }

    // Validate team exists if provided
    if (createUserDto.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: createUserDto.teamId },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }

    // Generate cryptographically secure random temporary password
    // Password must meet strength requirements: uppercase, lowercase, number, special char, min 8 chars
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*(),.?":{}|<>';
    const allChars = uppercase + lowercase + numbers + special;

    // Generate password with at least one of each required type using crypto.randomBytes
    let tempPassword = '';
    // Use crypto.randomBytes for cryptographically secure random selection
    const randomBytes = crypto.randomBytes(4);
    tempPassword += uppercase[randomBytes[0] % uppercase.length];
    tempPassword += lowercase[randomBytes[1] % lowercase.length];
    tempPassword += numbers[randomBytes[2] % numbers.length];
    tempPassword += special[randomBytes[3] % special.length];

    // Fill remaining length (minimum 8, so 4 more chars) using crypto.randomBytes
    const remainingLength = 16 - tempPassword.length;
    const additionalBytes = crypto.randomBytes(remainingLength);
    for (let i = 0; i < remainingLength; i++) {
      tempPassword += allChars[additionalBytes[i] % allChars.length];
    }

    // Shuffle the password using Fisher-Yates algorithm with crypto.randomBytes
    const passwordArray = tempPassword.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const randomBytesForShuffle = crypto.randomBytes(1);
      const j = randomBytesForShuffle[0] % (i + 1);
      [passwordArray[i], passwordArray[j]] = [
        passwordArray[j],
        passwordArray[i],
      ];
    }
    tempPassword = passwordArray.join('');

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Validate organization exists
    if (!createUserDto.orgId) {
      throw new BadRequestException('Organization ID is required');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: createUserDto.orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Create user with INACTIVE status, mustChangePassword = true
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        orgId: createUserDto.orgId,
        roleId: createUserDto.roleId,
        teamId: createUserDto.teamId,
        status: UserStatus.INACTIVE,
        mustChangePassword: true,
      },
      include: {
        role: true,
        team: true,
      },
    });

    // Send email with temporary password (no verification needed in new schema)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await this.emailService.sendVerificationEmailWithPassword(
        user.email,
        user.name,
        '', // No verification token needed
        tempPassword,
      );
    } catch (error: unknown) {
      // Log error but don't fail user creation
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorCode =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : 'N/A';
      console.error('❌ Failed to send password email:', errorMessage);
      console.error(
        'Error details:',
        JSON.stringify({
          email: user.email,
          errorMessage,
          errorCode,
        }),
      );
    }

    // Return user response WITHOUT password
    return this.mapToUserResponse(user);
  }

  async findAll(query: UserQueryDto): Promise<UserListResponseDto> {
    const { status, roleId, teamId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null, // Only non-deleted users
    };

    if (status) {
      where.status = status;
    }

    if (roleId) {
      where.roleId = roleId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: true,
          team: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.mapToUserResponse(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        team: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is soft deleted
    if (user.deletedAt !== null) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // Check if user exists and not deleted
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.deletedAt !== null) {
      throw new NotFoundException('User not found');
    }

    // Prevent changing Super Admin's role to another role
    if (existingUser.role.name === 'SUPER_ADMIN' && updateUserDto.roleId) {
      const newRole = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });

      if (newRole && newRole.name !== 'SUPER_ADMIN') {
        throw new BadRequestException(
          'Cannot change Super Admin role. Super Admin must always remain as Super Admin to ensure system has at least one Super Admin.',
        );
      }
    }

    // Validate role if provided
    if (updateUserDto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      // Check if trying to change role to Super Admin
      if (role.name === 'SUPER_ADMIN') {
        // Check if there's already a Super Admin (excluding current user)
        const existingSuperAdmin = await this.prisma.user.findFirst({
          where: {
            role: {
              name: 'SUPER_ADMIN',
            },
            deletedAt: null,
            id: {
              not: id, // Exclude current user
            },
          },
        });

        // If Super Admin already exists (and it's not the current user), prevent changing role to Super Admin
        if (existingSuperAdmin) {
          throw new BadRequestException(
            'Super Admin already exists. Only one Super Admin is allowed in the system.',
          );
        }
        // If no Super Admin exists, allow changing role to Super Admin
      }
    }

    // Validate team if provided
    if (updateUserDto.teamId !== undefined) {
      if (updateUserDto.teamId !== null) {
        const team = await this.prisma.team.findUnique({
          where: { id: updateUserDto.teamId },
        });

        if (!team) {
          throw new NotFoundException('Team not found');
        }
      }
    }

    // Update user
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        role: true,
        team: true,
      },
    });

    return this.mapToUserResponse(user);
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt !== null) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting Super Admin
    if (user.role.name === 'SUPER_ADMIN') {
      throw new BadRequestException(
        'Cannot delete Super Admin. Super Admin is a protected account and cannot be deleted.',
      );
    }

    // Soft delete: set deletedAt and status to INACTIVE
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
      },
    });

    return { message: 'User deleted successfully' };
  }

  private mapToUserResponse(
    user: Prisma.UserGetPayload<{
      include: {
        role: true;
        team: true;
      };
    }>,
  ): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      roleId: user.roleId,
      teamId: user.teamId,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
      },
      team: user.team
        ? {
            id: user.team.id,
            name: user.team.name,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
