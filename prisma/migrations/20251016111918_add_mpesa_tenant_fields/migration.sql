-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "mpesaCallbackUrl" TEXT,
ADD COLUMN     "mpesaConsumerKey" TEXT,
ADD COLUMN     "mpesaConsumerSecret" TEXT,
ADD COLUMN     "mpesaEnvironment" TEXT DEFAULT 'sandbox',
ADD COLUMN     "mpesaIsActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mpesaPasskey" TEXT,
ADD COLUMN     "mpesaShortCode" TEXT;
