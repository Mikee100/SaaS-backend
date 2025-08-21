-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "dashboardPreferences" JSONB,
ADD COLUMN     "themePreferences" JSONB;
