import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto, UserListResponseDto } from './dto/user-response.dto';
import { EmailService } from '../common/services/email.service';
import { UserStatus } from '@prisma/client';

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
    if (role.name === 'Super Admin') {
      // Check if Super Admin already exists
      const existingSuperAdmin = await this.prisma.user.findFirst({
        where: {
          role: {
            name: 'Super Admin',
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

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours expiry

    // Create user with PENDING status and emailVerified = false
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        roleId: createUserDto.roleId,
        teamId: createUserDto.teamId,
        status: UserStatus.PENDING,
        emailVerified: false,
        verificationToken,
        tokenExpiry,
        mustChangePassword: true,
      },
      include: {
        role: true,
        team: true,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken,
      );
      console.log(`✅ Verification email sent successfully to ${user.email}`);
    } catch (error: any) {
      // Log error but don't fail user creation
      console.error('❌ Failed to send verification email:', error?.message || error);
      console.error('Error details:', JSON.stringify({
        email: user.email,
        errorMessage: error?.message || 'Unknown error',
        errorCode: error?.code || 'N/A',
      }));
      // Optionally, you could delete the user here if email sending is critical
    }

    return this.mapToUserResponse(user);
  }

  async findAll(query: UserQueryDto): Promise<UserListResponseDto> {
    const { status, roleId, teamId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
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

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
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
    if (existingUser.role.name === 'Super Admin' && updateUserDto.roleId) {
      const newRole = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });

      if (newRole && newRole.name !== 'Super Admin') {
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
      if (role.name === 'Super Admin') {
        // Check if there's already a Super Admin (excluding current user)
        const existingSuperAdmin = await this.prisma.user.findFirst({
          where: {
            role: {
              name: 'Super Admin',
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

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<UserResponseDto> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt !== null) {
      throw new NotFoundException('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password and set mustChangePassword to false
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
      include: {
        role: true,
        team: true,
      },
    });

    return this.mapToUserResponse(updatedUser);
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
    if (user.role.name === 'Super Admin') {
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

  private mapToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      emailVerified: user.emailVerified,
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
