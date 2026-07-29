-- AlterEnum
ALTER TYPE "CoverCandidateType" ADD VALUE 'SHORT';

-- AlterTable: 巡回日時をモード別に分割（既存の lastCrawledAt を両方にコピーしてから削除）
ALTER TABLE "performers" ADD COLUMN     "lastCrawledCoverAt" TIMESTAMP(3),
ADD COLUMN     "lastCrawledKaraokeAt" TIMESTAMP(3);

UPDATE "performers"
SET "lastCrawledCoverAt" = "lastCrawledAt",
    "lastCrawledKaraokeAt" = "lastCrawledAt"
WHERE "lastCrawledAt" IS NOT NULL;

ALTER TABLE "performers" DROP COLUMN "lastCrawledAt";

-- AlterTable: 動画長キャッシュ
ALTER TABLE "youtube_video_metadata_cache" ADD COLUMN     "durationSeconds" INTEGER;
