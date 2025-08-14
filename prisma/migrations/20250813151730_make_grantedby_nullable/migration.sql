-- DropForeignKey
ALTER TABLE "public"."UserPermission" DROP CONSTRAINT "UserPermission_grantedBy_fkey";

-- AlterTable
ALTER TABLE "public"."UserPermission" ALTER COLUMN "grantedBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."UserPermission" ADD CONSTRAINT "UserPermission_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
