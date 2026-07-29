-- CreateEnum
CREATE TYPE "CoverCandidateStatus" AS ENUM ('PENDING', 'ADOPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CoverCandidateType" AS ENUM ('COVER_VIDEO', 'KARAOKE_STREAM');

-- CreateEnum
CREATE TYPE "CrawlKeywordKind" AS ENUM ('COVER_VIDEO', 'KARAOKE_STREAM', 'EXCLUDE');

-- AlterTable
ALTER TABLE "performers" ADD COLUMN     "youtubeChannelId" TEXT,
ADD COLUMN     "youtubeUploadsPlaylistId" TEXT,
ADD COLUMN     "lastCrawledAt" TIMESTAMP(3),
ADD COLUMN     "crawlEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "cover_candidates" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "channelId" TEXT NOT NULL,
    "channelTitle" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "detectedType" "CoverCandidateType" NOT NULL DEFAULT 'COVER_VIDEO',
    "status" "CoverCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "sourcePerformerId" TEXT,
    "adoptedCoverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cover_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "kind" "CrawlKeywordKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawl_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "performers_youtubeChannelId_key" ON "performers"("youtubeChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "cover_candidates_videoId_key" ON "cover_candidates"("videoId");

-- CreateIndex
CREATE INDEX "cover_candidates_status_publishedAt_idx" ON "cover_candidates"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crawl_keywords_keyword_key" ON "crawl_keywords"("keyword");

-- AddForeignKey
ALTER TABLE "cover_candidates" ADD CONSTRAINT "cover_candidates_sourcePerformerId_fkey" FOREIGN KEY ("sourcePerformerId") REFERENCES "performers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
