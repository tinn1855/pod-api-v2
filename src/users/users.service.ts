import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserInternalDto } from './dto/create-user.dto';
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

  async create(createUserDto: CreateUserInternalDto): Promise<UserResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Get role - if roleId not provided, default to SELLER
    let role: { id: string; name: string } | null;
    if (createUserDto.roleId) {
      role = await this.prisma.role.findUnique({
        where: { id: createUserDto.roleId },
      });
      if (!role) {
        throw new NotFoundException('Role not found');
      }
    } else {
      // Default to SELLER role
      role = await this.prisma.role.findFirst({
        where: { name: 'SELLER' },
      });
      if (!role) {
        throw new NotFoundException(
          'Default SELLER role not found. Please run database seed.',
        );
      }
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
    // Security: No HTML tags, scripts, or dangerous characters
    // Password must be min 8 chars and safe from XSS/injection attacks
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]|'; // Safe special chars only
    const allChars = uppercase + lowercase + numbers + special;

    // Validation regex: No HTML tags, scripts, or dangerous characters
    // Blocks: < > & ; / \ ' " ` and script-related patterns
    const dangerousPatternRegex =
      /[<>&;/\\'"`]|script|javascript|onerror|onclick|onload|eval|expression/i;

    let tempPassword = '';
    // Generate random password until it's safe
    do {
      tempPassword = '';
      const passwordLength = 10 + (crypto.randomBytes(1)[0] % 3); // 10-12 chars
      const randomBytes = crypto.randomBytes(passwordLength);

      for (let i = 0; i < passwordLength; i++) {
        tempPassword += allChars[randomBytes[i] % allChars.length];
      }
    } while (
      dangerousPatternRegex.test(tempPassword) ||
      tempPassword.length < 8
    );

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Generate verification token with 60 minutes expiration
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date();
    verificationTokenExpiresAt.setMinutes(
      verificationTokenExpiresAt.getMinutes() + 60,
    );

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
        roleId: role.id, // Use role.id from validated/default role
        teamId: createUserDto.teamId,
        status: UserStatus.INACTIVE,
        mustChangePassword: true,
        verificationToken,
        verificationTokenExpiresAt,
      },
      include: {
        role: true,
        team: true,
      },
    });

    // Send email with temporary password (no verification needed in new schema)
    try {
      await this.emailService.sendVerificationEmailWithPassword(
        user.email,
        user.name,
        verificationToken, // Send verification token
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
      verificationToken: (user.verificationToken as string | null) ?? null,
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
