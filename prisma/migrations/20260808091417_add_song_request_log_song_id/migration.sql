-- 注意: `prisma migrate dev` は schema.prisma に表現されていない pg_trgm の GIN
-- インデックス（songs_title_trgm_idx / performers_name_trgm_idx /
-- artists_name_trgm_idx）を毎回 DROP INDEX しようとするため、生成後に該当行を
-- 削除している。これらは 20260716120000_add_pg_trgm / 20260725160000_add_artist_trgm
-- で作成された、類似検索に必要なインデックス。

-- AlterTable
ALTER TABLE "song_request_logs" ADD COLUMN     "songId" TEXT;

-- CreateIndex
CREATE INDEX "song_request_logs_songId_createdAt_idx" ON "song_request_logs"("songId", "createdAt");
