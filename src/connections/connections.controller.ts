import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { ConnectConnectionDto } from './dto/connect-connection.dto';
import { ShopConnectionResponseDto } from './dto/connection-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Connections')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')
export class ConnectionsController {
  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('shops/:shopId/connections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new connection for a shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiResponse({
    status: 201,
    description: 'Connection created successfully',
    type: ShopConnectionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Connection already exists' })
  async create(
    @Req() req: UserRequest,
    @Param('shopId') shopId: string,
    @Body() createConnectionDto: CreateConnectionDto,
  ): Promise<ShopConnectionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.connectionsService.create(
      shopId,
      createConnectionDto,
      req.user.sub,
      user?.role?.name || '',
      req.user.orgId,
      req.user.sub,
    );
  }

  @Get('shops/:shopId/connections')
  @ApiOperation({ summary: 'List connections for a shop' })
  @ApiParam({ name: 'shopId', description: 'Shop ID' })
  @ApiResponse({
    status: 200,
    description: 'List of connections',
    type: [ShopConnectionResponseDto],
  })
  async findAll(
    @Param('shopId') shopId: string,
  ): Promise<ShopConnectionResponseDto[]> {
    return this.connectionsService.findAll(shopId);
  }

  @Delete('connections/:connectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete connection (hard delete)' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiResponse({ status: 204, description: 'Connection deleted successfully' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(
    @Req() req: UserRequest,
    @Param('connectionId') connectionId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.connectionsService.remove(
      connectionId,
      req.user.sub,
      user?.role?.name || '',
      req.user.orgId,
      req.user.sub,
    );
  }

  @Post('connections/:connectionId/connect')
  @ApiOperation({ summary: 'Connect and store credentials' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiResponse({
    status: 200,
    description: 'Connection established successfully',
    type: ShopConnectionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async connect(
    @Req() req: UserRequest,
    @Param('connectionId') connectionId: string,
    @Body() connectDto: ConnectConnectionDto,
  ): Promise<ShopConnectionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.connectionsService.connect(
      connectionId,
      connectDto,
      req.user.sub,
      user?.role?.name || '',
      req.user.orgId,
      req.user.sub,
    );
  }

  @Post('connections/:connectionId/disconnect')
  @ApiOperation({ summary: 'Disconnect and remove credentials' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiResponse({
    status: 200,
    description: 'Connection disconnected successfully',
    type: ShopConnectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async disconnect(
    @Req() req: UserRequest,
    @Param('connectionId') connectionId: string,
  ): Promise<ShopConnectionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { role: true },
    });

    return this.connectionsService.disconnect(
      connectionId,
      req.user.sub,
      user?.role?.name || '',
      req.user.orgId,
      req.user.sub,
    );
  }

}

