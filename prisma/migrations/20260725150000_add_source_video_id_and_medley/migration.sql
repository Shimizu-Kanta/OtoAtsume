-- AlterEnum
ALTER TYPE "CoverType" ADD VALUE 'MEDLEY';

-- AlterEnum
ALTER TYPE "CoverCandidateType" ADD VALUE 'MEDLEY';

-- AlterEnum
ALTER TYPE "CrawlKeywordKind" ADD VALUE 'MEDLEY';

-- AlterTable
ALTER TABLE "covers" ADD COLUMN     "sourceVideoId" TEXT;

-- Backfill: sourceUrl から videoId を抽出（watch?v= / youtu.be / shorts|live|embed の各形式）
UPDATE "covers"
SET "sourceVideoId" = COALESCE(
  substring("sourceUrl" from 'youtu\.be/([A-Za-z0-9_-]{6,64})'),
  substring("sourceUrl" from '[?&]v=([A-Za-z0-9_-]{6,64})'),
  substring("sourceUrl" from 'youtube\.com/(?:shorts|live|embed)/([A-Za-z0-9_-]{6,64})')
)
WHERE "sourceVideoId" IS NULL;

-- CreateIndex
CREATE INDEX "covers_sourceVideoId_idx" ON "covers"("sourceVideoId");
