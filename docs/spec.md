# うたあつめ 現行仕様書

最終更新: 2026-07-06  
対象: GitHub `main` ブランチ基準

---

## 1. サービス概要

**うたあつめ**は、VTuber、配信者、歌い手などの「歌ってみた動画」「歌枠」「ライブ歌唱記録」などを集める公開データベースである。

一般ユーザー登録やプロフィール機能は持たず、投稿者個人ではなく、楽曲・活動者・歌唱記録の情報を蓄積する集合知型サービスとして運用する。

正式ドメインは以下。

```text
https://oto-atsume.com
```

---

## 2. 基本方針

### 2.1 一般ユーザー登録なし

一般ユーザー向けのアカウント登録、プロフィール、投稿者名表示は行わない。

カバー記録登録ページでは、ログインなしで登録可能であること、投稿者名や投稿履歴を記録・表示しないことを案内する。

### 2.2 集合知型データベース

登録者個人を前面に出すのではなく、以下の情報を蓄積する。

```text
- 活動者
- 楽曲
- 原曲アーティスト
- 歌唱日
- 歌唱種別
- 情報元URL
- タイムスタンプ
- 通報・修正対象情報
```

### 2.3 権利・公開範囲への配慮

以下のような、権利者や配信者が公開していない情報の登録は避ける。

```text
- メンバー限定配信
- 非公開コンテンツ
- 購入者以外に公開されていない有料配信内の情報
```

ただし、有料ライブであっても、公式サイト、公式SNS、ニュース記事などでセットリストが公開されている場合は登録可能とする。

### 2.4 paid_live と同一URL大量登録の扱い

`source_visibility = paid_live` は、それだけで疑わしいものとして扱わない。

理由は、有料ライブ後にセットリストが公開されることがあるためである。

また、同じURLで複数曲が登録されることも、それだけで疑わしいものとして扱わない。

理由は、歌枠・歌配信では1つの配信URL内に複数曲が含まれるためである。

---

## 3. データモデル

### 3.1 AdminUser

管理者ユーザーを表す。

主な項目:

```text
id
email
role
createdAt
```

現在の権限 enum は `ADMIN` のみ。

### 3.2 Group

活動者の所属グループを表す。

主な項目:

```text
id
name
performers
createdAt
```

`name` は unique。

### 3.3 Performer

活動者を表す。

主な項目:

```text
id
name
groupId
youtubeUrl
officialUrl
colorCode
debutDate
birthday
status
aliases
tags
covers
createdAt
updatedAt
```

`debutDate` と `birthday` は日付型で、アニバーサリー表示や検索・集計に使用する。

活動者の状態は `MasterDataStatus` で管理する。

```text
PENDING
APPROVED
HIDDEN
```

### 3.4 PerformerAlias

活動者の別名を管理する。

```text
performerId + alias
```

の組み合わせは unique。

### 3.5 Tag / PerformerTag

活動者にタグを紐づける。

`Tag` と `PerformerTag` により多対多で管理する。

### 3.6 Artist / Song / SongArtist

原曲アーティストと楽曲を管理する。

`Song` は楽曲名と原曲URLを持つ。

`Artist` はアーティスト名を持つ。

`SongArtist` により、楽曲とアーティストを多対多で紐づける。

### 3.7 Cover

歌唱記録の中心テーブル。

主な項目:

```text
id
songId
performedAt
coverType
sourceUrl
sourceTitle
timestampSeconds
status
ipHash
userAgentHash
performers
reports
createdAt
updatedAt
```

歌唱種別 `CoverType` は以下。

```text
COVER_VIDEO
KARAOKE_STREAM
LIVE_EVENT
SHORT
OTHER
```

カバー記録の状態 `ContentStatus` は以下。

```text
PENDING
APPROVED
REJECTED
HIDDEN
```

### 3.8 CoverPerformer

カバー記録と活動者を多対多で紐づける。

```text
coverId + performerId
```

の組み合わせは unique。

### 3.9 Report

カバー記録への通報を管理する。

主な項目:

```text
id
coverId
reason
memo
status
ipHash
createdAt
```

通報理由 `ReportReason` は以下。

```text
WRONG_SONG
WRONG_PERFORMER
WRONG_DATE
BROKEN_URL
MEMBERS_ONLY_CONTENT
NON_PUBLIC_PAID_CONTENT
DUPLICATE
OTHER
```

通報ステータス `ReportStatus` は以下。

```text
PENDING
RESOLVED
REJECTED
```

### 3.10 PerformerApplication

活動者申請を表すモデル。

現在の運用方針では、確認待ち活動者は `Performer.status = PENDING` に寄せている。

そのため、今後完全に不要であれば削除を検討する。

### 3.11 RateLimitBucket

レート制限用のバケットを管理する。

主な項目:

```text
key
count
resetAt
```

### 3.12 YouTubeVideoMetadataCache

YouTube動画メタデータのキャッシュを管理する。

主な項目:

```text
videoId
canonicalUrl
sourceTitle
description
publishedAt
channelId
channelTitle
thumbnailUrl
tags
fetchedAt
updatedAt
```

### 3.13 SiteAccessLog

日次レポート用のページアクセスログ。

主な項目:

```text
id
path
createdAt
```

### 3.14 AppErrorLog

日次レポート用のエラーログ。

主な項目:

```text
id
type
message
path
createdAt
```

### 3.15 DailySiteReport

日次集計結果を保存する。

主な項目:

```text
id
date
accessCount
addedCoverCount
addedSongCount
pendingReportCount
pendingPerformerCount
errorCounts
createdAt
updatedAt
```

`date` は unique。

---

## 4. 公開画面仕様

## 4.1 トップページ

トップページでは以下を表示する。

```text
- サービス説明
- カバー記録登録導線
- 追加したい楽曲URL入力フォーム
- カバー検索フォーム
- カバー記録数 / 活動者数 / 楽曲数
- アニバーサリーカバー
- ランダムカバー
- 新着カバー記録
```

### 4.1.1 カバー記録登録導線

トップページには以下の2つの導線がある。

```text
1. 追加したい楽曲URL入力フォーム
2. カバー記録を登録ボタン
```

URLフォームに入力して送信した場合、以下のように登録画面へ遷移する。

```text
/covers/new?sourceUrl=<入力URL>&autoFetch=1
```

URL未入力の場合は、通常の登録画面として動作する。

### 4.1.2 検索フォーム

トップページの検索フォームは `/covers` に対して以下の条件を送信する。

```text
song
performer
artist
```

### 4.1.3 統計カード

以下の件数を表示する。

```text
カバー記録数
活動者数
楽曲数
```

## 4.2 アニバーサリーカバー

トップページでは、今日がデビュー記念日または誕生日の活動者を対象に、アニバーサリーカバーを表示する。

活動者カラーが設定されている場合、枠線や背景グラデーションに使用する。

表示対象は以下。

```text
- debutDate が今日の活動者
- birthday が今日の活動者
```

## 4.3 ランダムカバー

登録済みカバー記録からランダムに表示する。

## 4.4 新着カバー記録

歌唱日が新しいカバー記録を表示する。

`/covers` への「すべて見る」リンクを表示する。

---

## 5. カバー記録登録仕様

## 5.1 登録ページ

登録ページは以下。

```text
/covers/new
```

入力項目:

```text
情報元URL
既存の活動者
活動者名直接入力
楽曲名
原曲アーティスト名
歌唱日
歌唱種別
配信・動画・ライブ名
タイムスタンプ秒数
```

## 5.2 URL初期入力

`sourceUrl` クエリパラメータがある場合、情報元URL入力欄の初期値として使用する。

`sourceUrl` が存在し、かつ `autoFetch=1` の場合、YouTube URL補助を自動実行する。

## 5.3 YouTube URL補助

YouTube URL補助は、情報元URLからYouTube動画情報を取得してフォームに反映する。

取得・反映する主な情報:

```text
canonicalUrl
sourceTitle
publishedDate
timestampSeconds
channelId
channelTitle
thumbnailUrl
```

反映先:

```text
sourceUrl
sourceTitle
performedAt
timestampSeconds
```

## 5.4 YouTubeメタデータキャッシュ

YouTube APIから取得した動画情報は `YouTubeVideoMetadataCache` に保存する。

取得元は以下のいずれかとして表示する。

```text
DBキャッシュ
YouTube API
YouTube APIで更新
```

## 5.5 活動者候補

YouTube情報取得後、活動者候補を表示する。

候補の推定理由:

```text
チャンネルURL
チャンネル名
動画タイトル
概要欄
```

候補を選択すると、既存活動者としてフォームに追加する。

## 5.6 楽曲候補

YouTube情報取得後、楽曲候補を表示する。

候補の推定理由:

```text
動画タイトル
概要欄
楽曲名・アーティスト名
```

候補を反映すると、以下がフォームに入力される。

```text
songTitle
artistNames
```

## 5.7 重複候補チェック

登録フォームには重複候補チェック機能がある。

YouTubeメタデータ反映、活動者選択、楽曲候補反映などと連動してチェックする。

同一URLや有料ライブ情報だけを理由に疑わしいとは扱わない。

## 5.8 CAPTCHA

公開フォームでは Cloudflare Turnstile CAPTCHA を使用する。

必要な環境変数:

```text
NEXT_PUBLIC_CAPTCHA_SITE_KEY
CAPTCHA_SECRET_KEY
```

正式ドメイン `oto-atsume.com` は Turnstile の許可ドメインに登録する必要がある。

---

## 6. 管理画面仕様

## 6.1 管理ログイン

管理画面は Google OAuth によりログインする。

管理者として許可されたメールアドレスのみ利用可能とする。

## 6.2 管理ナビゲーション

管理画面には以下のナビゲーションを表示する。

```text
ダッシュボード
日次レポート
カバー記録
通報
確認待ち活動者
所属グループ
活動者
タグ
楽曲
アーティスト
一括インポート
```

## 6.3 日次レポート履歴

管理画面 `/admin/daily-reports` では、過去60件の日次レポートを表示する。

表示項目:

```text
対象日
アクセス
追加カバー
新規楽曲
エラー
未処理通報
確認待ち活動者
作成日時
```

エラーがない場合は「なし」と表示する。

## 6.4 確認待ち活動者

確認待ち活動者は `Performer.status = PENDING` として管理する。

管理画面では `/admin/performers?status=PENDING` から確認できる。

## 6.5 一括インポート

活動者などのマスタデータを一括インポートできる。

活動者インポートでは以下のような項目を扱う。

```text
name
groupName
youtubeUrl
officialUrl
colorCode
debutDate
birthday
tags
aliases
status
```

---

## 7. 日次レポート仕様

## 7.1 集計対象

日次レポートは以下を集計する。

```text
accessCount
addedCoverCount
addedSongCount
pendingReportCount
pendingPerformerCount
errorCounts
```

## 7.2 対象日

デフォルトの対象日は JST の前日。

たとえば JST 00:10 に実行すると、前日1日分を集計する。

## 7.3 集計方法

```text
accessCount:
  site_access_logs.createdAt が対象日の件数

addedCoverCount:
  covers.createdAt が対象日の件数

addedSongCount:
  songs.createdAt が対象日の件数

pendingReportCount:
  reports.status = PENDING の件数

pendingPerformerCount:
  performers.status = PENDING の件数

errorCounts:
  app_error_logs を type ごとに groupBy した件数
```

集計結果は `daily_site_reports` に upsert する。

## 7.4 送信API

日次レポート送信API:

```text
POST /api/admin/daily-report/send
```

認証方式:

```text
Authorization: Bearer <DAILY_REPORT_API_TOKEN>
```

`dryRun=1` を指定した場合、Discord送信を行わず、集計結果のみ返す。

```text
POST /api/admin/daily-report/send?dryRun=1
```

## 7.5 Discord通知

`dryRun` でない場合、集計結果を Discord Webhook に送信する。

必要な環境変数:

```text
DAILY_REPORT_API_TOKEN
DISCORD_DAILY_REPORT_WEBHOOK_URL
```

---

## 8. アクセスログ仕様

公開ページ表示時に、`/api/telemetry/access` へPOSTしてアクセスログを保存する。

記録対象外:

```text
/api
/admin
/_next
/favicon
/robots
/sitemap
```

保存失敗時もユーザー体験を壊さないよう、常に `{ ok: true }` を返す。

---

## 9. エラーログ仕様

サーバーエラーなどを `app_error_logs` に記録する。

主な項目:

```text
type
message
path
createdAt
```

日次レポートでは `type` ごとに件数集計する。

---

## 10. 外部サービス連携

## 10.1 Google OAuth

管理画面ログインに Google OAuth を使用する。

正式ドメイン運用では、Google Cloud Console 側に以下を設定する。

```text
承認済み JavaScript 生成元:
https://oto-atsume.com

承認済みリダイレクト URI:
https://oto-atsume.com/api/auth/callback/google
```

## 10.2 Cloudflare Turnstile

公開フォームのスパム対策に Cloudflare Turnstile を使用する。

正式ドメイン `oto-atsume.com` は Turnstile の許可ドメインに追加する。

## 10.3 YouTube Data API

YouTube URL補助で YouTube Data API を使用する。

取得した動画メタデータは DB にキャッシュする。

必要な環境変数:

```text
YOUTUBE_DATA_API_KEY
```

## 10.4 Discord Webhook

日次レポート通知に Discord Webhook を使用する。

Webhook URL はコードや Public repo には置かず、Cloud Run の環境変数または Secret Manager で管理する。

---

## 11. デプロイ・運用仕様

## 11.1 GitHub Actions

`main` ブランチへの push で Cloud Run へデプロイする。

主な処理:

```text
Checkout
Google Cloud 認証
gcloud セットアップ
Docker Buildx セットアップ
Artifact Registry 認証
pnpm / Node.js セットアップ
Prisma Client 生成
typecheck
Docker image build & push
Cloud SQL Auth Proxy 起動
Prisma migration deploy
Cloud Run deploy
```

## 11.2 Cloud Run

Cloud Run サービス名:

```text
oto-atsume
```

リージョン:

```text
asia-northeast1
```

## 11.3 Secret Manager 方針

GitHub Actions の Cloud Run deploy では、以下を Secret Manager 参照として設定する。

```text
DATABASE_URL
NEXT_PUBLIC_SITE_URL
NEXTAUTH_URL
ADMIN_ALLOWED_EMAILS
AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
CAPTCHA_SECRET_KEY
NEXT_PUBLIC_CAPTCHA_SITE_KEY
```

`NEXTAUTH_URL` や `NEXT_PUBLIC_SITE_URL` は、文字列環境変数と Secret 参照が混在すると Cloud Run deploy で型不一致エラーになる。

原則として、Secret Manager 側の値を更新し、Cloud Run は Secret 参照に統一する。

## 11.4 正式ドメイン

正式ドメイン:

```text
https://oto-atsume.com
```

以下の設定を正式ドメインに合わせる必要がある。

```text
NEXTAUTH_URL
NEXT_PUBLIC_SITE_URL
Google OAuth redirect URI
Cloudflare Turnstile allowed hostname
```

---

## 12. 現在の主要機能一覧

### 公開側

```text
トップページ
カバー記録検索
カバー記録一覧
カバー記録詳細
カバー記録登録
トップページURL入力から登録画面へ遷移
YouTube URL自動取得
YouTubeメタデータキャッシュ
活動者候補表示
楽曲候補表示
重複候補チェック
通報
Cloudflare Turnstile CAPTCHA
アニバーサリーカバー
ランダムカバー
新着カバー記録
```

### 管理側

```text
Google OAuth 管理ログイン
ダッシュボード
日次レポート履歴
カバー記録管理
通報管理
確認待ち活動者管理
所属グループ管理
活動者管理
タグ管理
楽曲管理
アーティスト管理
一括インポート
```

### 運用側

```text
Cloud Run デプロイ
Cloud SQL / Prisma migration
GitHub Actions CI/CD
アクセスログ記録
エラーログ記録
Discord日次レポート
Secret Managerによる環境変数管理
正式ドメイン運用
```

---

## 13. 現在の懸念・改善候補

### 13.1 PerformerApplication の整理

schema には `PerformerApplication` が残っている。

現在の運用方針では、確認待ち活動者は `Performer.status = PENDING` に寄せているため、今後不要であれば migration で削除を検討する。

### 13.2 日次レポートの自動実行

本体側には日次レポート送信APIがある。

定時実行は Public repo ではなく、Private な ops repo の GitHub Actions から呼び出す設計が望ましい。

### 13.3 日次レポートのグラフ化

現在は管理画面でテーブル表示している。

今後、アクセス数、追加カバー数、エラー数などをグラフ化すると、日ごとの推移を確認しやすくなる。

### 13.4 Cloud Run 環境変数管理

手動で文字列環境変数を追加・変更すると、Secret参照との型不一致が起きやすい。

原則として Secret Manager 側の値を更新する運用に統一する。

### 13.5 トップページURL入力フォームのUX

現在、トップページには `追加したい楽曲URL` 入力フォームと `カバー記録を登録` ボタンがある。

今後、文言や配置を調整し、URL入力済みの場合の導線をより自然にする余地がある。

---

## 14. 一言まとめ

現在のうたあつめは、**ログインなしで歌唱記録を登録でき、YouTube URLから登録情報の補助を受けられ、管理者は Google OAuth でログインしてマスタ・通報・日次レポートを管理できる公開型歌唱記録データベース**である。

正式ドメイン、Cloudflare Turnstile、Google OAuth、YouTube Data API、Discord日次レポート、Cloud Run自動デプロイまで整備されており、本番運用の土台はかなり揃っている。
