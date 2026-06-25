# Production Backup

Cloud Run 本番環境では Cloud SQL for PostgreSQL を正とし、データ保護は Cloud SQL の backup 機能を前提にします。

## 基本方針

- Cloud SQL automated backups を有効にする。
- Point-in-time recovery は有効化を推奨する。更新頻度が低い初期運用でも、誤更新や migration 失敗から戻せる余地が増える。
- 本番 DB に対して `pnpm prisma:seed` を不用意に実行しない。
- migration 前には手動 backup を作成する。
- GitHub Actions の `pnpm prisma:deploy` は本番 DB に migration を適用するため、失敗時は Cloud Run deploy に進めない。

## 手動 Backup

```bash
gcloud sql backups create --instance=<INSTANCE_NAME> --project=<PROJECT_ID>
gcloud sql backups list --instance=<INSTANCE_NAME> --project=<PROJECT_ID>
```

`<INSTANCE_NAME>` と `<PROJECT_ID>` は本番環境の値に置き換えてください。

## Restore 概要

1. 復元対象の backup ID を確認する。
2. 復元先を既存 instance にするか、新規検証 instance にするかを決める。
3. 重要な障害対応では、先に新規 instance へ restore してデータ状態を確認する。
4. アプリの `DATABASE_URL` / Secret Manager の向き先を変更する場合は、Cloud Run の revision と接続先を明示して確認する。

## Migration 前後の運用

- `main` branch へ push する前に migration 内容を review する。
- production migration の直前に手動 backup を作成する。
- `prisma migrate deploy` 後に Cloud Run deploy が走るため、migration とアプリ revision の互換性を保つ。
- migration 失敗時は deploy されない。失敗ログを確認し、必要なら restore または修正 migration を検討する。
