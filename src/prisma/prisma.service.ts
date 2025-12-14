import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // #region agent log
    const dbUrl = process.env.DATABASE_URL;
    const dbUrlMasked = dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'NOT_SET';
    fetch('http://127.0.0.1:7242/ingest/a495b76f-9510-48ff-81af-f164daeec251', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'prisma.service.ts:9',
        message: 'Checking DATABASE_URL before connection',
        data: {
          dbUrlExists: !!dbUrl,
          dbUrlMasked: dbUrlMasked,
          dbUrlLength: dbUrl?.length || 0,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion

    // #region agent log
    try {
      fetch(
        'http://127.0.0.1:7242/ingest/a495b76f-9510-48ff-81af-f164daeec251',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'prisma.service.ts:14',
            message: 'Attempting database connection',
            data: {},
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'B',
          }),
        },
      ).catch(() => {});
      // #endregion
      await this.$connect();
      // #region agent log
      fetch(
        'http://127.0.0.1:7242/ingest/a495b76f-9510-48ff-81af-f164daeec251',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'prisma.service.ts:17',
            message: 'Database connection successful',
            data: {},
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'B',
          }),
        },
      ).catch(() => {});
      // #endregion
    } catch (error: any) {
      // #region agent log
      const errorDetails = {
        name: error?.name,
        code: error?.code,
        message: error?.message?.substring(0, 200),
        errorCode: error?.errorCode,
        meta: error?.meta || null,
      };
      fetch(
        'http://127.0.0.1:7242/ingest/a495b76f-9510-48ff-81af-f164daeec251',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'prisma.service.ts:70',
            message: 'Database connection failed',
            data: errorDetails,
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'post-fix',
            hypothesisId: 'C',
          }),
        },
      ).catch(() => {});
      // #endregion

      // Enhanced error message for authentication failures
      if (error?.errorCode === 'P1000') {
        const dbUrl = process.env.DATABASE_URL || '';
        const urlMatch = dbUrl.match(
          /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/,
        );
        if (urlMatch) {
          const [, username, , host, port, database] = urlMatch;
          const helpfulMessage = `
⚠️ Database Connection Failed (P1000)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The provided database credentials are invalid.

Connection Details:
  • Host: ${host}
  • Port: ${port}
  • Database: ${database}
  • Username: ${username}

Troubleshooting Steps:
1. Verify PostgreSQL server is running: Check if PostgreSQL service is started
2. Verify credentials: Ensure the password in .env matches your PostgreSQL password
3. Verify database exists: Run "CREATE DATABASE ${database};" if needed
4. Verify user permissions: Ensure user "${username}" has access to database "${database}"

To reset PostgreSQL password (if needed):
  • Windows: Check pg_hba.conf or use pgAdmin
  • Linux/Mac: Use "sudo -u postgres psql" then "ALTER USER postgres PASSWORD 'newpassword';"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          `.trim();
          error.message =
            helpfulMessage + '\n\nOriginal error: ' + error.message;
        }
      }
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
