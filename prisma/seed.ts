import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
interface PermissionDefinition {
  name: string;
  description: string;
}

interface RoleDefinition {
  name: string;
  description: string;
  permissionNames: string[];
}

/* ============================================
   VALIDATION
============================================ */
function validateEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL');
  }
}

function validatePasswordStrength(password: string) {
  const rules = [
    password.length >= 6,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*(),.?":{}|<>]/.test(password),
  ];

  if (!rules.every(Boolean)) {
    console.warn(
      '⚠️  WARNING: Password should contain uppercase, lowercase, number, special char and >= 8 chars',
    );
  }
}

/* ============================================
   PERMISSIONS
============================================ */
function getPermissionDefinitions(): PermissionDefinition[] {
  return [
    // USER
    { name: 'USER_CREATE', description: 'Create user' },
    { name: 'USER_READ', description: 'Read user' },
    { name: 'USER_UPDATE', description: 'Update user' },
    { name: 'USER_DELETE', description: 'Delete user' },

    // ROLE & PERMISSION
    { name: 'ROLE_CREATE', description: 'Create role' },
    { name: 'ROLE_READ', description: 'Read role' },
    { name: 'ROLE_UPDATE', description: 'Update role' },
    { name: 'ROLE_DELETE', description: 'Delete role' },
    { name: 'PERMISSION_READ', description: 'Read permission' },

    // TEAM
    { name: 'TEAM_CREATE', description: 'Create team' },
    { name: 'TEAM_READ', description: 'Read team' },
    { name: 'TEAM_UPDATE', description: 'Update team' },
    { name: 'TEAM_DELETE', description: 'Delete team' },

    // SHOP
    { name: 'SHOP_CREATE', description: 'Create shop' },
    { name: 'SHOP_READ', description: 'Read shop' },
    { name: 'SHOP_UPDATE', description: 'Update shop' },
    { name: 'SHOP_DELETE', description: 'Delete shop' },

    // PRODUCT
    { name: 'PRODUCT_CREATE', description: 'Create product' },
    { name: 'PRODUCT_READ', description: 'Read product' },
    { name: 'PRODUCT_UPDATE', description: 'Update product' },
    { name: 'PRODUCT_DELETE', description: 'Delete product' },

    // DESIGN
    { name: 'DESIGN_CREATE', description: 'Create design' },
    { name: 'DESIGN_READ', description: 'Read design' },
    { name: 'DESIGN_UPDATE', description: 'Update design' },
    { name: 'DESIGN_APPROVE', description: 'Approve design' },
    { name: 'DESIGN_REJECT', description: 'Reject design' },

    // CONTENT
    { name: 'CONTENT_CREATE', description: 'Create content' },
    { name: 'CONTENT_READ', description: 'Read content' },
    { name: 'CONTENT_UPDATE', description: 'Update content' },
    { name: 'CONTENT_DELETE', description: 'Delete content' },

    // ORDER
    { name: 'ORDER_READ', description: 'Read order' },
    { name: 'ORDER_UPDATE', description: 'Update order' },
    { name: 'ORDER_CANCEL', description: 'Cancel order' },
    { name: 'ORDER_FULFILL', description: 'Fulfill order' },

    // PRODUCTION
    { name: 'PRODUCTION_JOB_READ', description: 'Read production job' },
    { name: 'PRODUCTION_JOB_UPDATE', description: 'Update production job' },
  ];
}

/* ============================================
   ROLES
============================================ */
function getRoleDefinitions(allPermissions: string[]): RoleDefinition[] {
  const adminPermissions = allPermissions.filter(
    (p) =>
      !p.startsWith('ROLE_') &&
      !p.startsWith('PERMISSION_') &&
      !p.startsWith('TEAM_'),
  );

  return [
    {
      name: 'SUPER_ADMIN',
      description: 'System owner',
      permissionNames: allPermissions,
    },
    {
      name: 'ADMIN',
      description: 'System administrator',
      permissionNames: adminPermissions,
    },
    {
      name: 'SELLER',
      description: 'Seller',
      permissionNames: [
        'SHOP_READ',
        'SHOP_UPDATE',
        'PRODUCT_READ',
        'PRODUCT_UPDATE',
        'ORDER_READ',
        'ORDER_UPDATE',
      ],
    },
    {
      name: 'DESIGNER',
      description: 'Designer',
      permissionNames: [
        'DESIGN_CREATE',
        'DESIGN_READ',
        'DESIGN_UPDATE',
        'CONTENT_READ',
      ],
    },
    {
      name: 'SUPPLIER',
      description: 'Supplier',
      permissionNames: [
        'ORDER_READ',
        'PRODUCTION_JOB_READ',
        'PRODUCTION_JOB_UPDATE',
      ],
    },
  ];
}

/* ============================================
   SEED LOGIC
============================================ */
async function main() {
  validateEnv();

  console.log('🌱 Seeding database...\n');

  const permissionDefs = getPermissionDefinitions();
  const permissionNames = permissionDefs.map((p) => p.name);
  const roleDefs = getRoleDefinitions(permissionNames);

  // Hash password outside transaction to avoid timeout
  const adminEmail = process.env.ADMIN_EMAIL ?? 'superadmin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? '12345678';
  const adminName = process.env.ADMIN_NAME ?? 'Super Admin';
  validatePasswordStrength(adminPassword);
  const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

  await prisma.$transaction(
    async (tx) => {
      /* ---------- CLEAN ALL DATA ---------- */
      console.log('🗑️  Cleaning all existing data...');

      // Delete in order of dependencies (child tables first)
      await tx.activityLog.deleteMany({});
      await tx.comment.deleteMany({});
      await tx.taskAssignee.deleteMany({});
      await tx.task.deleteMany({});
      await tx.content.deleteMany({});
      await tx.designFolder.deleteMany({});
      await tx.design.deleteMany({});
      await tx.entityFile.deleteMany({});
      await tx.file.deleteMany({});
      await tx.board.deleteMany({});
      await tx.account.deleteMany({});
      await tx.shop.deleteMany({});
      await tx.user.deleteMany({});
      await tx.rolePermission.deleteMany({});
      await tx.role.deleteMany({});
      await tx.permission.deleteMany({});
      await tx.team.deleteMany({});
      await tx.organization.deleteMany({});

      console.log('✅ All data cleaned\n');

      /* ---------- ORGANIZATION ---------- */
      const org = await tx.organization.create({
        data: { name: 'Default Organization' },
      });
      console.log(`📁 Created organization: ${org.name}`);

      /* ---------- TEAM ---------- */
      const team = await tx.team.create({
        data: { name: 'Default Team' },
      });
      console.log(`👥 Created team: ${team.name}`);

      /* ---------- PERMISSIONS ---------- */
      await tx.permission.createMany({
        data: permissionNames.map((name) => ({ name })),
        skipDuplicates: true,
      });

      const permissions = await tx.permission.findMany();
      const permissionMap = new Map(permissions.map((p) => [p.name, p.id]));

      /* ---------- ROLES ---------- */
      const roleMap = new Map<string, string>();

      for (const roleDef of roleDefs) {
        const role = await tx.role.upsert({
          where: { name: roleDef.name },
          update: { description: roleDef.description },
          create: {
            name: roleDef.name,
            description: roleDef.description,
          },
        });
        roleMap.set(role.name, role.id);
      }

      /* ---------- ROLE PERMISSIONS ---------- */
      for (const roleDef of roleDefs) {
        const roleId = roleMap.get(roleDef.name)!;

        const data = roleDef.permissionNames
          .map((perm) => {
            const permissionId = permissionMap.get(perm);
            return permissionId ? { roleId, permissionId } : null;
          })
          .filter(Boolean) as { roleId: string; permissionId: string }[];

        await tx.rolePermission.createMany({
          data,
          skipDuplicates: true,
        });
      }

      /* ---------- SUPER ADMIN (Only ONE allowed) ---------- */
      const superAdminRoleId = roleMap.get('SUPER_ADMIN');

      if (!superAdminRoleId) {
        throw new Error('SUPER_ADMIN role not found');
      }

      // Validate: Only 1 super admin is allowed
      const existingSuperAdmins = await tx.user.count({
        where: { roleId: superAdminRoleId },
      });

      if (existingSuperAdmins > 0) {
        throw new Error('❌ Only ONE Super Admin is allowed in the system');
      }

      const superAdmin = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          status: UserStatus.ACTIVE,
          mustChangePassword: false,
          roleId: superAdminRoleId,
          orgId: org.id,
          teamId: team.id,
        },
      });

      console.log(`👑 Created Super Admin: ${superAdmin.email}`);
    },
    {
      timeout: 30000, // 30 seconds
    },
  );

  console.log('✅ Seed completed successfully');
}

/* ============================================
   RUN
============================================ */
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
