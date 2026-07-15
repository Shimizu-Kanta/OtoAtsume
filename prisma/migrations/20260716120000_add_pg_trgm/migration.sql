-- 表記ゆれ対応の類似検索（similarity）用に pg_trgm を有効化する。
-- Cloud SQL for PostgreSQL では pg_trgm はサポート対象拡張のため、
-- cloudsqlsuperuser ロールを持つユーザー（デフォルトユーザー）で CREATE EXTENSION 可能。
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "songs_title_trgm_idx" ON "songs" USING GIN (title gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "performers_name_trgm_idx" ON "performers" USING GIN (name gin_trgm_ops);
