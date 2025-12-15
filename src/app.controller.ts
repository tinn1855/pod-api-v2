import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-12-14T15:32:54.370Z' },
        uptime: { type: 'number', example: 12345 },
        database: { type: 'string', example: 'connected' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        timestamp: { type: 'string', example: '2025-12-14T15:32:54.370Z' },
        uptime: { type: 'number', example: 12345 },
        database: { type: 'string', example: 'disconnected' },
        error: { type: 'string', example: 'Database connection failed' },
      },
    },
  })
  async healthCheck() {
    const timestamp = new Date().toISOString();

    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      const databaseStatus = 'connected';

      return {
        status: 'ok',
        timestamp,
        uptime: Math.floor(process.uptime()),
        database: databaseStatus,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp,
        uptime: Math.floor(process.uptime()),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
