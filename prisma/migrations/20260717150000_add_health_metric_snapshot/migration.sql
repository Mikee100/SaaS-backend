-- Persisted health check history for admin dashboard trend charts (previously in-memory only)

CREATE TABLE "HealthMetricSnapshot" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "dbResponseTimeMs" INTEGER NOT NULL,
    "cpuPercent" INTEGER NOT NULL,
    "memoryPercent" INTEGER NOT NULL,
    "diskPercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HealthMetricSnapshot_createdAt_idx" ON "HealthMetricSnapshot"("createdAt");
