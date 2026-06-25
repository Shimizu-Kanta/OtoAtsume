# うたあつめ Ver.1.0.1

VTuber、配信者、歌い手などの歌ってみた動画・歌枠・ライブ歌唱記録を登録・閲覧するデータベースサービスです。

## 方針

- 一般ユーザー登録・一般ログインは作らない
- 投稿者プロフィール、ニックネーム、投稿履歴、コメント、いいねは扱わない
- 中心テーブルは `covers`
- 非公開情報や公開情報元がない記録は登録対象にしない
- 同じ `sourceUrl` に複数曲が紐づくことを正常な挙動として扱う

## 技術スタック

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 方針のローカル UI コンポーネント
- Prisma
- PostgreSQL
- NextAuth.js Google OAuth

## セットアップ

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

`.env` の `ADMIN_ALLOWED_EMAILS` には管理者として許可する Google アカウントのメールアドレスをカンマ区切りで設定してください。`NEXTAUTH_URL` は NextAuth.js が OAuth callback URL を生成するために使うため、ローカルでは `http://localhost:3000` を設定します。

管理画面は一般公開 UI からリンクせず、管理者が `/admin` を直接開くかブックマークからアクセスする前提です。

## Cloud Run デプロイ

このリポジトリには `main` branch への push を契機に、Docker image を Artifact Registry に push し、Prisma migration を適用してから Cloud Run に deploy する GitHub Actions workflow を含めています。

### 必要な GCP リソース

- Artifact Registry の Docker repository
- Cloud Run service
- Cloud SQL for PostgreSQL instance
- Cloud SQL database / user
- Secret Manager secrets
- GitHub Actions 用の deploy service account
- Cloud Run runtime service account
- GitHub Actions と GCP を接続する Workload Identity Federation

Cloud SQL connection name は `PROJECT_ID:REGION:INSTANCE_NAME` 形式です。

### Cloud Run 環境変数

Cloud Run には Secret Manager 経由で以下を設定します。DB パスワード、OAuth secret、認証 secret はリポジトリに書かないでください。

| 環境変数 | 用途 |
| --- | --- |
| `DATABASE_URL` | Cloud SQL for PostgreSQL の接続文字列 |
| `NEXT_PUBLIC_SITE_URL` | 公開 URL |
| `NEXTAUTH_URL` | NextAuth.js が callback URL を生成するための公開 URL |
| `ADMIN_ALLOWED_EMAILS` | 管理者として許可するメールアドレス。カンマ区切り |
| `AUTH_SECRET` | NextAuth.js の署名 secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CAPTCHA_SECRET_KEY` | CAPTCHA 検証用 secret |
| `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | CAPTCHA site key |

CAPTCHA は Cloudflare Turnstile を使います。ローカル開発では `CAPTCHA_SECRET_KEY` / `NEXT_PUBLIC_CAPTCHA_SITE_KEY` が未設定でも投稿フォームの CAPTCHA は skip できます。本番では必ず両方を Secret Manager に設定してください。未設定の場合、本番の投稿・通報・活動者申請は保存されません。

公開投稿系フォームのレート制限は Cloud SQL の `rate_limit_buckets` table に保存します。IP アドレスはそのまま保存せず、scope と user agent を含めて hash 化した key を保存します。

Cloud Run runtime の `DATABASE_URL` は Cloud SQL connector を使う前提で、例として以下のような形式にします。

```text
postgresql://USER:PASSWORD@localhost/DB_NAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME&schema=public
```

Secret Manager には workflow と同じ名前で secret を作成しておきます。

```bash
gcloud secrets create DATABASE_URL --data-file=-
gcloud secrets create NEXT_PUBLIC_SITE_URL --data-file=-
gcloud secrets create NEXTAUTH_URL --data-file=-
gcloud secrets create ADMIN_ALLOWED_EMAILS --data-file=-
gcloud secrets create AUTH_SECRET --data-file=-
gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
gcloud secrets create CAPTCHA_SECRET_KEY --data-file=-
gcloud secrets create NEXT_PUBLIC_CAPTCHA_SITE_KEY --data-file=-
```

Windows PowerShell では pipe 経由の `--data-file=-` が意図通り動かない場合があるため、temp file 経由で値を追加します。

```powershell
$tmp = New-TemporaryFile
Set-Content -LiteralPath $tmp -Value "https://<Cloud Run URL>" -NoNewline -Encoding UTF8
gcloud secrets create NEXTAUTH_URL --data-file=$tmp
Remove-Item -LiteralPath $tmp
```

既存 secret の値を更新する場合は `create` ではなく version を追加します。

```powershell
$tmp = New-TemporaryFile
Set-Content -LiteralPath $tmp -Value "secret-value" -NoNewline -Encoding UTF8
gcloud secrets versions add GOOGLE_CLIENT_SECRET --data-file=$tmp
Remove-Item -LiteralPath $tmp
```

Google OAuth の Authorized redirect URI には、公開 URL に続けて以下を登録してください。

```text
https://<Cloud Run URL>/api/auth/callback/google
```

### GitHub Actions 設定

Repository Variables:

| 変数 | 例 |
| --- | --- |
| `GCP_PROJECT_ID` | `my-project` |
| `GCP_REGION` | `asia-northeast1` |
| `ARTIFACT_REGISTRY_REPOSITORY` | `oto-atsume` |
| `CLOUD_RUN_SERVICE` | `oto-atsume` |
| `CLOUD_RUN_SERVICE_ACCOUNT` | `oto-atsume-runtime@my-project.iam.gserviceaccount.com` |
| `CLOUD_SQL_CONNECTION_NAME` | `my-project:asia-northeast1:oto-atsume-db` |

Repository Secrets:

| Secret | 用途 |
| --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider resource name |
| `GCP_SERVICE_ACCOUNT` | deploy 用 service account email |
| `MIGRATION_DATABASE_URL` | GitHub Actions から `prisma migrate deploy` を実行するための接続文字列 |

`MIGRATION_DATABASE_URL` は workflow 内の Cloud SQL Auth Proxy に接続するため、例として以下のような形式にします。

```text
postgresql://USER:PASSWORD@127.0.0.1:5432/DB_NAME?schema=public
```

deploy 用 service account には少なくとも Artifact Registry への push、Cloud Run deploy、Cloud SQL Auth Proxy 接続に必要な権限を付与します。Cloud Run runtime service account には `roles/cloudsql.client` と Secret Manager の secret accessor 権限を付与してください。

### Prisma migration

ローカル開発では `pnpm prisma:migrate` を使います。本番環境では migration file を生成せず、既存 migration を適用するだけにします。

```bash
pnpm prisma:deploy
```

GitHub Actions では Cloud SQL Auth Proxy を起動し、`MIGRATION_DATABASE_URL` を `DATABASE_URL` として渡して `prisma migrate deploy` を実行します。migration が失敗した場合、Cloud Run deploy は実行されません。

本番データのバックアップ方針は [docs/production-backup.md](docs/production-backup.md) を参照してください。migration 前に Cloud SQL backup を作成する運用を推奨します。

## 主な画面

- `/` トップページ
- `/covers` カバー記録一覧・検索
- `/covers/new` カバー記録登録
- `/covers/:id` カバー記録詳細
- `/covers/:id/report` 通報
- `/performers` 活動者一覧
- `/songs` 楽曲一覧
- `/performer-applications/new` 活動者申請

管理者向け画面:

- `/admin` 管理者トップ
- `/admin/covers` カバー記録管理
- `/admin/reports` 通報管理
- `/admin/performer-applications` 活動者申請管理
- `/admin/groups` 所属グループ管理
- `/admin/performers` 活動者管理
- `/admin/songs` 楽曲管理
- `/admin/artists` アーティスト管理
- `/admin/imports` 一括インポート

## API

公開 API:

- `GET /api/covers`
- `GET /api/covers/:id`
- `POST /api/covers`
- `POST /api/covers/:id/report`
- `GET /api/performers`
- `GET /api/performers/:id`
- `GET /api/songs`
- `GET /api/songs/:id`
- `POST /api/performer-applications`

管理 API:

- `GET /api/admin/reports`
- `GET /api/admin/reports/:id`
- `PATCH /api/admin/reports/:id`
- `GET /api/admin/performer-applications`
- `GET /api/admin/performer-applications/:id`
- `PATCH /api/admin/performer-applications/:id`
- `GET /api/admin/covers`
- `PATCH /api/admin/covers/:id`
- `GET /api/admin/performers`
- `POST /api/admin/performers`
- `PATCH /api/admin/performers/:id`
- `GET /api/admin/songs`
- `POST /api/admin/songs`
- `PATCH /api/admin/songs/:id`
- `GET /api/admin/artists`
- `POST /api/admin/artists`
- `PATCH /api/admin/artists/:id`

## 残タスク

- Cloud SQL backup / restore の定期運用確認
