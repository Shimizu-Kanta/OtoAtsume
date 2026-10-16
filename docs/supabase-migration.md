# Cloud SQL → Supabase 本番切り替え手順

DB を Cloud SQL（`oto-atsume:asia-northeast1:oto-atsume-db`）から Supabase（Tokyo）へ切り替えるときの手順です。アクセスの少ない深夜帯に行います。

- **[手動]**：GCP コンソール、Supabase ダッシュボード、GitHub の設定画面での操作
- **[Claude Code]**：リポジトリ内の作業とローカルからのコマンド実行

Secret Manager の Secret は `:latest` ではなく、常にバージョン番号で参照します。`:latest` はインスタンス起動時に解決されるため、旧リビジョンへトラフィックを戻しても新しい値を読んでしまい、ロールバックにならないためです。

## 0. 事前準備：現行サービスを `DATABASE_URL:1` に固定する [Claude Code、実行前に確認を取る]

切り替え作業の前（前日まででもよい）に、稼働中のサービスを Cloud SQL 向けの旧バージョンに固定します。DB の向き先は変わりません。

```bash
gcloud run services update oto-atsume \
  --project oto-atsume --region asia-northeast1 \
  --update-secrets DATABASE_URL=DATABASE_URL:1
```

- 新しいリビジョンが作られるので、その名前を**ロールバック先リビジョン**として控えておく
  ```bash
  gcloud run services describe oto-atsume --project oto-atsume --region asia-northeast1 \
    --format="value(status.latestReadyRevisionName)"
  ```
- 本番サイトが今までどおり動くことを確認する
- ここから切り替え完了まで、main への他のマージは止める（旧 workflow のデプロイが走ると、`:latest` 参照に戻ってしまうため）

## 1. `DATABASE_URL` に新しいバージョンを追加する [手動]

- Secret Manager の `DATABASE_URL` に、Supabase の Transaction pooler の URL（末尾に `?pgbouncer=true&connection_limit=5`）を新しいバージョンとして追加する
- 追加されたバージョン番号を確認する。workflow（`.github/workflows/cloud-run.yml` の `secrets` 配列）は `DATABASE_URL:2` を指定している。番号が 2 でなければ、PR の番号を直してからマージする
- 稼働中のサービスは `:1` に固定済みなので、追加しても本番には影響しない

## 2. 本番ダンプとリストア [Claude Code]

リハーサル（Phase 4）と同じ手順で、Cloud SQL の最新データを Supabase へ移します。2026-10-16 のリハーサルでは、ダンプ 7 秒、リストア 8 秒、検証 1 分弱でした（DB 17MB）。

- Cloud SQL へは Cloud SQL Auth Proxy（`--gcloud-auth`）経由でつなぐ。認証情報は Secret Manager の `DATABASE_URL:1` から読み、画面やファイルには残さない
- `pg_dump` / `pg_restore` は Supabase に合わせて Postgres 17 のもの（Docker の `postgres:17`）を使う
- Supabase にはリハーサルのデータと RLS の migration が残っているので、リストアには `--clean --if-exists` を付けて、ダンプに含まれるテーブルを作り直す。これで `_prisma_migrations` も Cloud SQL と同じ 17 件に戻る。RLS の migration は、4 のデプロイで `prisma migrate deploy` がもう一度当てる
  ```bash
  pg_dump "$CLOUDSQL_URL" --schema=public --no-owner --no-privileges --format=custom --file=otoatsume_YYYYMMDDHHMM.dump
  pg_restore --dbname="$DIRECT_URL" --no-owner --no-privileges --schema=public --clean --if-exists otoatsume_YYYYMMDDHHMM.dump
  ```
- ダンプを取った時刻を記録する。この時刻からデプロイ完了までに旧 DB へ入った登録は、5 の差分確認で拾う
- `scripts/verify-migration.ts` で比較し（`SOURCE_DATABASE_URL` に Proxy 経由の Cloud SQL、`TARGET_DATABASE_URL` か `DIRECT_URL` に Supabase）、`prisma migrate status` が最新になっていることを確認する

## 3. GitHub secret `MIGRATION_DATABASE_URL` を差し替える [手動]

- 値を Supabase の Session pooler（`*.pooler.supabase.com:5432`）の URL に変える
- **2 が終わってから、マージの直前に行う。** 差し替えたあとに main へのデプロイが走ると、Supabase に migration を当てつつ Cloud SQL 向けのアプリをデプロイしてしまうため

## 4. PR をマージしてデプロイする [手動]

workflow は次の順で動きます。

1. Supabase に `prisma migrate deploy` を実行する（2 で最新にしてあるので変化なし）
2. `DATABASE_URL:2` を明示指定し、Cloud SQL 接続を外して（`--clear-cloudsql-instances`）Cloud Run にデプロイする

## 5. 切り替え後の確認 [Claude Code]

- `verify-migration.ts` で行数を再比較する。2 のダンプ以降に旧 DB へ登録があった場合は差分を報告し、少なければ手動で再登録する
- 本番サイトの主要ページ（トップ、`/covers`、`/covers/new` での登録、`/admin`）を確認する
- Cloud Run のログに接続エラー（`P1001`、`prepared statement` 関連など）が出ていないことを確認する
- Actions の `Daily DB backup` を手動実行し、`gs://oto-atsume-db-backups/daily/` にファイルができることを確認する（`github-deploy` の書き込み権限が足りているかの確認を兼ねる）

## ロールバック

0 で控えたリビジョンは `DATABASE_URL:1` に固定されていて、Cloud SQL 接続も付いています。そのリビジョンへトラフィックを戻します。

```bash
gcloud run services update-traffic oto-atsume \
  --project oto-atsume --region asia-northeast1 \
  --to-revisions <ロールバック先リビジョン>=100
```

続けて、次のデプロイで Supabase 向けに戻らないようにします。

- 移行 PR を revert する
- GitHub secret `MIGRATION_DATABASE_URL` を Cloud SQL Auth Proxy 向けの値（`127.0.0.1:5432`）に戻す

**注意：切り替え後に Supabase へ書き込まれたデータ（歌唱記録の登録、管理画面での編集、レート制限の記録など）は、Cloud SQL 側にはありません。** 戻す前に `verify-migration.ts` で Supabase 側にしかないレコードを洗い出し、必要なものは Cloud SQL 側へ手動で再登録してください。

Cloud SQL は移行後 2 週間は削除しないので、その間はこの手順を使えます。

## 後片付け（Phase 7）での注意

- `DATABASE_URL` のバージョン 1（Cloud SQL 向け）は、**ロールバック猶予の 2 週間が終わり、Cloud SQL を削除するときまで破棄しない。** 先に破棄すると、ロールバック先リビジョンが起動できなくなる
- そのほかの Secret の古いバージョンは、workflow の `secrets` 配列が参照している番号以外なら、いつ破棄してもよい
