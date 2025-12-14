/**
 * Database Seed Script
 * 
 * Tạo dữ liệu ban đầu: Permissions, Roles, và Admin User
 */

import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 ============================================');
  console.log('   Bắt đầu seed database...');
  console.log('============================================\n');

  try {
    // ============================================
    // BƯỚC 1: Tạo Permissions
    // ============================================
    console.log('📋 Bước 1: Tạo các Permissions...\n');

    // User Management Permissions
    const userPermissions = [
      { name: 'USER_CREATE', description: 'Quyền tạo user mới' },
      { name: 'USER_READ', description: 'Quyền xem danh sách user' },
      { name: 'USER_UPDATE', description: 'Quyền cập nhật user' },
      { name: 'USER_DELETE', description: 'Quyền xóa user' },
    ];

    // Role & Permission Management
    const rolePermissions = [
      { name: 'ROLE_CREATE', description: 'Quyền tạo role mới' },
      { name: 'ROLE_READ', description: 'Quyền xem danh sách roles' },
      { name: 'ROLE_UPDATE', description: 'Quyền cập nhật role' },
      { name: 'ROLE_DELETE', description: 'Quyền xóa role' },
      { name: 'PERMISSION_READ', description: 'Quyền xem danh sách permissions' },
    ];

    // Team Management
    const teamPermissions = [
      { name: 'TEAM_CREATE', description: 'Quyền tạo team mới' },
      { name: 'TEAM_READ', description: 'Quyền xem danh sách teams' },
      { name: 'TEAM_UPDATE', description: 'Quyền cập nhật team' },
      { name: 'TEAM_DELETE', description: 'Quyền xóa team' },
    ];

    // Shop Management
    const shopPermissions = [
      { name: 'SHOP_CREATE', description: 'Quyền tạo shop mới' },
      { name: 'SHOP_READ', description: 'Quyền xem danh sách shops' },
      { name: 'SHOP_UPDATE', description: 'Quyền cập nhật shop' },
      { name: 'SHOP_DELETE', description: 'Quyền xóa shop' },
    ];

    // Account Management
    const accountPermissions = [
      { name: 'ACCOUNT_CREATE', description: 'Quyền tạo account mới' },
      { name: 'ACCOUNT_READ', description: 'Quyền xem danh sách accounts' },
      { name: 'ACCOUNT_UPDATE', description: 'Quyền cập nhật account' },
      { name: 'ACCOUNT_DELETE', description: 'Quyền xóa account' },
    ];

    // Platform Management
    const platformPermissions = [
      { name: 'PLATFORM_CREATE', description: 'Quyền tạo platform mới' },
      { name: 'PLATFORM_READ', description: 'Quyền xem danh sách platforms' },
      { name: 'PLATFORM_UPDATE', description: 'Quyền cập nhật platform' },
      { name: 'PLATFORM_DELETE', description: 'Quyền xóa platform' },
      { name: 'ACCOUNT_PLATFORM_CREATE', description: 'Quyền kết nối account với platform' },
      { name: 'ACCOUNT_PLATFORM_UPDATE', description: 'Quyền cập nhật account platform' },
      { name: 'ACCOUNT_PLATFORM_DELETE', description: 'Quyền xóa kết nối account platform' },
    ];

    // Product Management
    const productPermissions = [
      { name: 'PRODUCT_CREATE', description: 'Quyền tạo product mới' },
      { name: 'PRODUCT_READ', description: 'Quyền xem danh sách products' },
      { name: 'PRODUCT_UPDATE', description: 'Quyền cập nhật product' },
      { name: 'PRODUCT_DELETE', description: 'Quyền xóa product' },
      { name: 'PRODUCT_VARIANT_CREATE', description: 'Quyền tạo product variant' },
      { name: 'PRODUCT_VARIANT_UPDATE', description: 'Quyền cập nhật product variant' },
      { name: 'PRODUCT_VARIANT_DELETE', description: 'Quyền xóa product variant' },
    ];

    // Design Management
    const designPermissions = [
      { name: 'DESIGN_CREATE', description: 'Quyền tạo design mới' },
      { name: 'DESIGN_READ', description: 'Quyền xem danh sách designs' },
      { name: 'DESIGN_UPDATE', description: 'Quyền cập nhật design' },
      { name: 'DESIGN_DELETE', description: 'Quyền xóa design' },
      { name: 'DESIGN_APPROVE', description: 'Quyền phê duyệt design' },
      { name: 'DESIGN_REJECT', description: 'Quyền từ chối design' },
    ];

    // Content Management
    const contentPermissions = [
      { name: 'CONTENT_CREATE', description: 'Quyền tạo content mới' },
      { name: 'CONTENT_READ', description: 'Quyền xem danh sách contents' },
      { name: 'CONTENT_UPDATE', description: 'Quyền cập nhật content' },
      { name: 'CONTENT_DELETE', description: 'Quyền xóa content' },
    ];

    // Listing Management
    const listingPermissions = [
      { name: 'LISTING_CREATE', description: 'Quyền tạo listing mới' },
      { name: 'LISTING_READ', description: 'Quyền xem danh sách listings' },
      { name: 'LISTING_UPDATE', description: 'Quyền cập nhật listing' },
      { name: 'LISTING_DELETE', description: 'Quyền xóa listing' },
      { name: 'LISTING_SYNC', description: 'Quyền đồng bộ listing với platform' },
    ];

    // Order Management
    const orderPermissions = [
      { name: 'ORDER_CREATE', description: 'Quyền tạo order mới' },
      { name: 'ORDER_READ', description: 'Quyền xem danh sách orders' },
      { name: 'ORDER_UPDATE', description: 'Quyền cập nhật order' },
      { name: 'ORDER_DELETE', description: 'Quyền xóa order' },
      { name: 'ORDER_CANCEL', description: 'Quyền hủy order' },
      { name: 'ORDER_REFUND', description: 'Quyền hoàn tiền order' },
      { name: 'ORDER_FULFILL', description: 'Quyền hoàn thành order' },
    ];

    // Production Management
    const productionPermissions = [
      { name: 'PRODUCTION_JOB_CREATE', description: 'Quyền tạo production job' },
      { name: 'PRODUCTION_JOB_READ', description: 'Quyền xem danh sách production jobs' },
      { name: 'PRODUCTION_JOB_UPDATE', description: 'Quyền cập nhật production job' },
      { name: 'PRODUCTION_JOB_DELETE', description: 'Quyền xóa production job' },
      { name: 'PRODUCTION_JOB_ASSIGN', description: 'Quyền gán production job cho supplier' },
      { name: 'PRODUCTION_JOB_STATUS_UPDATE', description: 'Quyền cập nhật trạng thái production job' },
    ];

    // Gộp tất cả permissions
    const allPermissions = [
      ...userPermissions,
      ...rolePermissions,
      ...teamPermissions,
      ...shopPermissions,
      ...accountPermissions,
      ...platformPermissions,
      ...productPermissions,
      ...designPermissions,
      ...contentPermissions,
      ...listingPermissions,
      ...orderPermissions,
      ...productionPermissions,
    ];

    // Tạo permissions
    interface CreatedPermission {
      id: string;
      name: string;
    }
    const createdPermissions: CreatedPermission[] = [];
    for (const perm of allPermissions) {
      const permission = await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      });
      createdPermissions.push(permission);
      console.log(`   ✓ ${perm.name} - ${perm.description}`);
    }
    console.log(`\n✅ Đã tạo ${createdPermissions.length} permissions\n`);

    // ============================================
    // BƯỚC 2: Tạo Roles
    // ============================================
    console.log('👑 Bước 2: Tạo các Roles...\n');

    interface RoleWithPermissions {
      role: { id: string; name: string; description: string | null };
      permissionNames: string[];
    }

    const roles = [
      {
        name: 'Admin',
        description: 'Quản trị viên hệ thống với đầy đủ quyền',
        permissionNames: allPermissions.map((p) => p.name), // Tất cả permissions
      },
      {
        name: 'Manager',
        description: 'Quản lý với quyền quản lý shops, products, orders',
        permissionNames: [
          ...shopPermissions.map((p) => p.name),
          ...accountPermissions.map((p) => p.name),
          ...platformPermissions.map((p) => p.name),
          ...productPermissions.map((p) => p.name),
          ...orderPermissions.map((p) => p.name),
          ...listingPermissions.map((p) => p.name),
          'USER_READ',
          'TEAM_READ',
          'DESIGN_READ',
          'CONTENT_READ',
          'PRODUCTION_JOB_READ',
        ],
      },
      {
        name: 'Designer',
        description: 'Nhà thiết kế với quyền quản lý designs và contents',
        permissionNames: [
          ...designPermissions.map((p) => p.name),
          ...contentPermissions.map((p) => p.name),
          'PRODUCT_READ',
          'SHOP_READ',
          'ORDER_READ',
        ],
      },
      {
        name: 'Operator',
        description: 'Nhân viên vận hành với quyền xử lý orders và production',
        permissionNames: [
          ...orderPermissions.filter((p) => !['ORDER_DELETE'].includes(p.name)).map((p) => p.name),
          ...productionPermissions.map((p) => p.name),
          'PRODUCT_READ',
          'DESIGN_READ',
          'CONTENT_READ',
          'LISTING_READ',
        ],
      },
      {
        name: 'Viewer',
        description: 'Người xem chỉ có quyền đọc',
        permissionNames: [
          'USER_READ',
          'ROLE_READ',
          'PERMISSION_READ',
          'TEAM_READ',
          'SHOP_READ',
          'ACCOUNT_READ',
          'PLATFORM_READ',
          'PRODUCT_READ',
          'DESIGN_READ',
          'CONTENT_READ',
          'LISTING_READ',
          'ORDER_READ',
          'PRODUCTION_JOB_READ',
        ],
      },
    ];

    const createdRoles: RoleWithPermissions[] = [];
    for (const roleData of roles) {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {
          description: roleData.description,
        },
        create: {
          name: roleData.name,
          description: roleData.description,
        },
      });
      createdRoles.push({ role, permissionNames: roleData.permissionNames });
      console.log(`   ✓ ${role.name} - ${role.description}`);
    }
    console.log(`\n✅ Đã tạo ${createdRoles.length} roles\n`);

    // ============================================
    // BƯỚC 3: Gán Permissions cho Roles
    // ============================================
    console.log('🔗 Bước 3: Gán permissions cho các Roles...\n');

    for (const { role, permissionNames } of createdRoles) {
      console.log(`   Đang gán permissions cho role: ${role.name}...`);
      let assignedCount = 0;

      for (const permName of permissionNames) {
        const permission = createdPermissions.find((p) => p.name === permName);
        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          });
          assignedCount++;
        }
      }
      console.log(`   ✓ ${role.name}: ${assignedCount} permissions\n`);
    }
    console.log('✅ Đã gán permissions cho tất cả roles\n');

    // ============================================
    // BƯỚC 4: Tạo Admin User
    // ============================================
    console.log('👤 Bước 4: Tạo Admin User...\n');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminRole = createdRoles.find((r) => r.role.name === 'Admin')!.role;

    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
        roleId: adminRole.id,
      },
      create: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        roleId: adminRole.id,
        status: UserStatus.ACTIVE,
        mustChangePassword: false,
      },
    });

    console.log(`   ✓ Tên: ${adminUser.name}`);
    console.log(`   ✓ Email: ${adminUser.email}`);
    console.log(`   ✓ Status: ${adminUser.status}`);
    console.log(`   ✓ Role: Admin\n`);

    // ============================================
    // THÔNG TIN ĐĂNG NHẬP
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 THÔNG TIN ĐĂNG NHẬP ADMIN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 TỔNG KẾT:');
    console.log(`   • ${createdPermissions.length} Permissions`);
    console.log(`   • ${createdRoles.length} Roles`);
    console.log(`   • 1 Admin User`);
    console.log('\n⚠️  LƯU Ý BẢO MẬT:');
    console.log('   - Vui lòng đổi password ngay sau lần đăng nhập đầu tiên!');
    console.log('   - Không chia sẻ thông tin đăng nhập này với người khác!');
    console.log('   - Để thay đổi thông tin admin, chỉnh sửa file .env và chạy lại seed\n');

    console.log('🎉 Seed database thành công!\n');
  } catch (error) {
    console.error('\n❌ Lỗi khi seed database:');
    console.error(error);
    throw error;
  }
}

// Chạy seed
main()
  .catch((e) => {
    console.error('\n❌ Seed thất bại!');
    console.error('Vui lòng kiểm tra:');
    console.error('  1. DATABASE_URL trong .env đã đúng chưa?');
    console.error('  2. Database đã được tạo chưa?');
    console.error('  3. PostgreSQL service đang chạy chưa?');
    console.error('\nChi tiết lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
