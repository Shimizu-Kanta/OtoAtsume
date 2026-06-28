-- CreateTable
CREATE TABLE "youtube_video_metadata_cache" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelTitle" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_video_metadata_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "youtube_video_metadata_cache_videoId_key" ON "youtube_video_metadata_cache"("videoId");

-- CreateIndex
CREATE INDEX "youtube_video_metadata_cache_channelId_idx" ON "youtube_video_metadata_cache"("channelId");

-- CreateIndex
CREATE INDEX "youtube_video_metadata_cache_fetchedAt_idx" ON "youtube_video_metadata_cache"("fetchedAt");
