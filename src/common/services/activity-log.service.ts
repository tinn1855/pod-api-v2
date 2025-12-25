import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType, Prisma } from '@prisma/client';

/**
 * Service for creating activity logs
 * Provides a simple helper method for logging user actions across the application
 */
@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an activity log entry
   * @param orgId - Organization ID
   * @param actorId - User ID who performed the action
   * @param action - Action name (e.g., 'CREATE', 'UPDATE', 'DELETE', 'APPROVE')
   * @param entityType - Type of entity affected
   * @param entityId - ID of the entity affected
   * @param metadata - Optional additional metadata (JSON object)
   * @returns Created activity log
   */
  async createLog(
    orgId: string,
    actorId: string,
    action: string,
    entityType: EntityType,
    entityId: string,
    metadata?: Record<string, unknown> | null,
  ): Promise<{
    id: string;
    orgId: string;
    actorId: string;
    action: string;
    entityType: EntityType;
    entityId: string;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }> {
    return this.prisma.activityLog.create({
      data: {
        orgId,
        actorId,
        action,
        entityType,
        entityId,
        metadata:
          metadata === null
            ? Prisma.JsonNull
            : metadata === undefined
              ? undefined
              : (metadata as Prisma.InputJsonValue),
      },
    });
  }
}

