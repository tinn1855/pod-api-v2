import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import {
  ActivityLogResponseDto,
  ActivityLogListResponseDto,
} from './dto/activity-log-response.dto';
import { Prisma } from '@prisma/client';

interface Cursor {
  createdAt: Date;
  id: string;
}

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ActivityLogQueryDto,
    orgId: string,
  ): Promise<ActivityLogListResponseDto> {
    const limit = Math.min(query.limit || 20, 100);
    const take = limit + 1; // Take one extra to check if there's a next page

    // Build where clause
    const where: Prisma.ActivityLogWhereInput = {
      orgId,
    };

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    // Handle cursor pagination
    if (query.cursor) {
      try {
        const cursor = this.decodeCursor(query.cursor);
        where.OR = [
          { createdAt: { lt: cursor.createdAt } },
          {
            AND: [
              { createdAt: cursor.createdAt },
              { id: { lt: cursor.id } },
            ],
          },
        ];
      } catch (error) {
        throw new BadRequestException('Invalid cursor format');
      }
    }

    // Fetch logs
    const logs = await this.prisma.activityLog.findMany({
      where,
      take,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    });

    // Check if there's a next page
    const hasNextPage = logs.length > limit;
    const items = hasNextPage ? logs.slice(0, limit) : logs;

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = this.encodeCursor({
        createdAt: lastItem.createdAt,
        id: lastItem.id,
      });
    }

    return {
      items: items.map((log) => this.mapToActivityLogResponse(log)),
      nextCursor,
    };
  }

  private decodeCursor(cursor: string): Cursor {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (!parsed.createdAt || !parsed.id) {
        throw new Error('Invalid cursor structure');
      }
      return {
        createdAt: new Date(parsed.createdAt),
        id: parsed.id,
      };
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  private encodeCursor(cursor: Cursor): string {
    const json = JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    });
    return Buffer.from(json, 'utf-8').toString('base64');
  }

  private mapToActivityLogResponse(
    log: Prisma.ActivityLogGetPayload<{
      include: {
        actor: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    }>,
  ): ActivityLogResponseDto {
    return {
      id: log.id,
      orgId: log.orgId,
      actorId: log.actorId,
      actor: log.actor,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata as Record<string, unknown> | null,
      createdAt: log.createdAt,
    };
  }
}

