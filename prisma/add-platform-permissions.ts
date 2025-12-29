import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to add Platform permissions to existing database
 * This script safely adds new permissions without deleting existing data
 */
async function main() {
  console.log('🔐 Adding Platform permissions...\n');

  const platformPermissions = [
    'PLATFORM_CREATE',
    'PLATFORM_READ',
    'PLATFORM_UPDATE',
    'PLATFORM_DELETE',
  ];

  try {
    // Add permissions (skip if already exists)
    for (const permName of platformPermissions) {
      await prisma.permission.upsert({
        where: { name: permName },
        update: {}, // No update needed if exists
        create: { name: permName },
      });
      console.log(`✅ Permission '${permName}' added/verified`);
    }

    // Get all permissions including new ones
    const permissions = await prisma.permission.findMany({
      where: {
        name: {
          in: platformPermissions,
        },
      },
    });

    const permissionMap = new Map(
      permissions.map((p) => [p.name, p.id]),
    );

    // Get SUPER_ADMIN and ADMIN roles
    const roles = await prisma.role.findMany({
      where: {
        name: {
          in: ['SUPER_ADMIN', 'ADMIN'],
        },
      },
    });

    // Add permissions to SUPER_ADMIN and ADMIN roles
    for (const role of roles) {
      for (const permName of platformPermissions) {
        const permissionId = permissionMap.get(permName);
        if (permissionId) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permissionId,
              },
            },
            update: {}, // No update needed if exists
            create: {
              roleId: role.id,
              permissionId: permissionId,
            },
          });
        }
      }
      console.log(
        `✅ Platform permissions added to role '${role.name}'`,
      );
    }

    console.log('\n✅ All Platform permissions added successfully!');
    console.log(
      '\n📝 Note: If you need to add these permissions to other roles,',
    );
    console.log(
      '   you can do so via the Roles API (PATCH /roles/:id/permissions)',
    );
  } catch (error) {
    console.error('❌ Error adding permissions:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

