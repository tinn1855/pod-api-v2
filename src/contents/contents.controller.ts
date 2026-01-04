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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContentsService } from './contents.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentQueryDto } from './dto/content-query.dto';
import {
  ContentResponseDto,
  ContentListResponseDto,
} from './dto/content-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Contents')
@ApiBearerAuth('JWT-auth')
@Controller('contents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DESIGNER', 'ADMIN', 'SUPER_ADMIN', 'SELLER')
export class ContentsController {
  constructor(
    private readonly contentsService: ContentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new content' })
  @ApiResponse({
    status: 201,
    description: 'Content created successfully',
    type: ContentResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Board or Shop not found' })
  async create(
    @Req() req: UserRequest,
    @Body() createContentDto: CreateContentDto,
  ): Promise<ContentResponseDto> {
    return this.contentsService.create(
      createContentDto,
      req.user.orgId,
      req.user.sub,
      req.user.sub,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List contents' })
  @ApiResponse({
    status: 200,
    description: 'List of contents',
    type: ContentListResponseDto,
  })
  async findAll(
    @Req() req: UserRequest,
    @Query() query: ContentQueryDto,
  ): Promise<ContentListResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.contentsService.findAll(
      query,
      req.user.orgId,
      req.user.sub,
      user?.role?.name || '',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({
    status: 200,
    description: 'Content details',
    type: ContentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findOne(
    @Req() req: UserRequest,
    @Param('id') id: string,
  ): Promise<ContentResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.contentsService.findOne(
      id,
      req.user.sub,
      user?.role?.name || '',
      req.user.orgId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({
    status: 200,
    description: 'Content updated successfully',
    type: ContentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Req() req: UserRequest,
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
  ): Promise<ContentResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.contentsService.update(
      id,
      updateContentDto,
      req.user.sub,
      user?.role?.name || '',
      req.user.orgId,
      req.user.sub,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete content (soft delete)' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 204, description: 'Content deleted successfully' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(
    @Req() req: UserRequest,
    @Param('id') id: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.contentsService.remove(
      id,
      req.user.sub,
      user?.role?.name || '',
      req.user.orgId,
      req.user.sub,
    );
  }
}

