# うたあつめ

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

`.env` の `ADMIN_ALLOWED_EMAILS` には管理者として許可する Google アカウントのメールアドレスをカンマ区切りで設定してください。

## 主な画面

- `/` トップページ
- `/covers` カバー記録一覧・検索
- `/covers/new` カバー記録登録
- `/covers/:id` カバー記録詳細
- `/covers/:id/report` 通報
- `/performers` 活動者一覧
- `/songs` 楽曲一覧
- `/performer-applications/new` 活動者申請
- `/admin` 管理者トップ

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

- CAPTCHA provider の実接続
- 永続型レート制限への置き換え
- 管理画面での詳細編集フォーム拡充
- GitHub Actions と Cloud Run デプロイ設定
