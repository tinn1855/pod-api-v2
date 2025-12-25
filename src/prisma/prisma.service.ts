import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error: any) {
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
