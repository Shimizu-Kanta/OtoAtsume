-- CreateTable
CREATE TABLE "site_access_logs" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_error_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_site_reports" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "accessCount" INTEGER NOT NULL,
    "addedCoverCount" INTEGER NOT NULL,
    "addedSongCount" INTEGER NOT NULL,
    "pendingReportCount" INTEGER NOT NULL,
    "pendingPerformerCount" INTEGER NOT NULL,
    "errorCounts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_site_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_access_logs_createdAt_idx" ON "site_access_logs"("createdAt");

-- CreateIndex
CREATE INDEX "site_access_logs_path_idx" ON "site_access_logs"("path");

-- CreateIndex
CREATE INDEX "app_error_logs_createdAt_idx" ON "app_error_logs"("createdAt");

-- CreateIndex
CREATE INDEX "app_error_logs_type_idx" ON "app_error_logs"("type");

-- CreateIndex
CREATE UNIQUE INDEX "daily_site_reports_date_key" ON "daily_site_reports"("date");

-- CreateIndex
CREATE INDEX "daily_site_reports_date_idx" ON "daily_site_reports"("date");
