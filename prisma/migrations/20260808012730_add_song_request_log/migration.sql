-- CreateTable
CREATE TABLE "song_request_logs" (
    "id" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "songName" TEXT NOT NULL,
    "artistName" TEXT,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "song_request_logs_normalizedQuery_createdAt_idx" ON "song_request_logs"("normalizedQuery", "createdAt");

-- CreateIndex
CREATE INDEX "song_request_logs_ipHash_normalizedQuery_createdAt_idx" ON "song_request_logs"("ipHash", "normalizedQuery", "createdAt");
