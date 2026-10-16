# Production Backup

本番 DB は Supabase（無料プラン）の PostgreSQL です。無料プランには日次バックアップがないため、GitHub Actions で毎日ダンプを取り、GCS に保存します。

## 日次バックアップ

`.github/workflows/db-backup.yml` が毎日 04:00 JST に実行されます。手動実行（workflow_dispatch）もできます。

- 接続先：GitHub secret `MIGRATION_DATABASE_URL`（Supabase の Session pooler）
- 形式：`pg_dump --format=custom --schema=public`。`pg_dump` は Supabase の Postgres メジャーバージョン（現在 17）に合わせる
- 保存先：`gs://oto-atsume-db-backups/daily/otoatsume_YYYYMMDDHHMM.dump`（時刻は JST）
  - プライベートバケット（公開アクセス禁止、均一なバケットレベルのアクセス）
  - ライフサイクルルールで 30 日経ったものを自動削除する
  - リポジトリが公開のため、Actions の artifact には置かない
- 権限：deploy 用 service account（`github-deploy`）に、バケット単位で `roles/storage.objectCreator` と `roles/storage.objectViewer` を付与している。`gcloud storage cp` はアップロード前に同名オブジェクトの有無を確認するため、書き込みだけでは 403 になる
- 失敗時：日次レポートと同じ Discord Webhook（Secret Manager の `DISCORD_DAILY_REPORT_WEBHOOK_URL`）に通知する

このジョブは毎日 DB に接続するため、無料プランの「7 日間非アクティブで自動停止」への備えにもなる見込みです。ただし公式にアクティビティとして数えられる保証はないので、停止通知のメールが来ないかは引き続き確認してください。

## Restore

ダンプには拡張機能が含まれないため、まっさらな DB に戻す場合は先に `pg_trgm` を `public` スキーマに作成します。

```bash
gcloud storage ls gs://oto-atsume-db-backups/daily/
gcloud storage cp gs://oto-atsume-db-backups/daily/<FILE>.dump .

psql "$TARGET_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;"
pg_restore --dbname="$TARGET_URL" --no-owner --no-privileges --schema=public <FILE>.dump
```

- 既存のテーブルがある DB に上書きする場合は `--clean --if-exists` を付ける
- 重要な障害対応では、先にローカルの Docker（`postgres:17`）へ restore してデータの状態を確認する
- アプリの `DATABASE_URL` / Secret Manager の向き先を変更する場合は、Cloud Run の revision と Secret のバージョン番号を明示して確認する

## Migration 前後の運用

- 本番 DB に対して `pnpm prisma:seed` を不用意に実行しない
- `main` branch へ push する前に migration 内容を review する。テーブルを追加する migration では RLS も有効にする
- 破壊的な migration の前には、Actions の `Daily DB backup` を手動実行してバックアップを取っておく
- `prisma migrate deploy` 後に Cloud Run deploy が走るため、migration とアプリ revision の互換性を保つ
- migration 失敗時は deploy されない。失敗ログを確認し、必要なら restore または修正 migration を検討する
