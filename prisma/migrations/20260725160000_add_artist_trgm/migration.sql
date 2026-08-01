-- アーティスト名の類似検索（サジェスト・表記ゆれ警告）用に pg_trgm の GIN インデックスを張る。
-- pg_trgm 拡張は 20260716120000_add_pg_trgm で有効化済み。
CREATE INDEX IF NOT EXISTS "artists_name_trgm_idx" ON "artists" USING GIN (name gin_trgm_ops);
