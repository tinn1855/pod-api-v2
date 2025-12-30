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
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopQueryDto } from './dto/shop-query.dto';
import {
  ShopResponseDto,
  ShopListResponseDto,
} from './dto/shop-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Shops')
@ApiBearerAuth('JWT-auth')
@Controller('shops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new shop' })
  @ApiResponse({
    status: 201,
    description: 'Shop created successfully',
    type: ShopResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Req() req: UserRequest,
    @Body() createShopDto: CreateShopDto,
  ): Promise<ShopResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.shopsService.create(
      createShopDto,
      req.user.orgId,
      req.user.sub,
      req.user.sub,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List shops' })
  @ApiResponse({
    status: 200,
    description: 'List of shops',
    type: ShopListResponseDto,
  })
  async findAll(
    @Req() req: UserRequest,
    @Query() query: ShopQueryDto,
  ): Promise<ShopListResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.shopsService.findAll(
      query,
      req.user.orgId,
      req.user.sub,
      user?.role?.name || '',
    );
  }

  @Get(':shopId')
  @ApiOperation({ summary: 'Get shop by ID' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiResponse({
    status: 200,
    description: 'Shop details',
    type: ShopResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findOne(
    @Req() req: UserRequest,
    @Param('shopId') shopId: string,
  ): Promise<ShopResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.shopsService.findOne(shopId, req.user.sub, user?.role?.name || '');
  }

  @Patch(':shopId')
  @ApiOperation({ summary: 'Update shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiResponse({
    status: 200,
    description: 'Shop updated successfully',
    type: ShopResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Req() req: UserRequest,
    @Param('shopId') shopId: string,
    @Body() updateShopDto: UpdateShopDto,
  ): Promise<ShopResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.shopsService.update(
      shopId,
      updateShopDto,
      req.user.sub,
      user?.role?.name || '',
      req.user.orgId,
      req.user.sub,
    );
  }

  @Delete(':shopId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete shop (hard delete)' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiResponse({ status: 204, description: 'Shop deleted successfully' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(
    @Req() req: UserRequest,
    @Param('shopId') shopId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.shopsService.remove(
      shopId,
      req.user.sub,
      user?.role?.name || '',
      req.user.orgId,
      req.user.sub,
    );
  }
}

