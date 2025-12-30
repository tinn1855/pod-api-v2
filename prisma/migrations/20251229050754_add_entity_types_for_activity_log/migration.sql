-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'USER';
ALTER TYPE "EntityType" ADD VALUE 'TEAM';
ALTER TYPE "EntityType" ADD VALUE 'ROLE';
ALTER TYPE "EntityType" ADD VALUE 'PLATFORM';
ALTER TYPE "EntityType" ADD VALUE 'SHOP';
ALTER TYPE "EntityType" ADD VALUE 'ACCOUNT';
ALTER TYPE "EntityType" ADD VALUE 'PRODUCT';
ALTER TYPE "EntityType" ADD VALUE 'ORDER';

-- AlterTable
ALTER TABLE "Platform" ALTER COLUMN "updatedAt" DROP DEFAULT;
