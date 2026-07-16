import type { Metadata } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "おとあつめのプライバシーポリシー"
};

const updatedAt = "2026年7月16日";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeading
        title="プライバシーポリシー"
        description="おとあつめで取り扱う情報と、その利用目的について説明します。"
      />

      <div className="rounded-md border bg-card p-5 text-sm leading-7 text-muted-foreground">
        <p>最終更新日: {updatedAt}</p>
        <p className="mt-3">
          おとあつめは、一般利用者のユーザー登録やプロフィール機能を提供しません。ただし、サービスの提供、荒らし対策、セキュリティ確保、運用改善のため、以下の情報を取り扱うことがあります。
        </p>
      </div>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">1. 取得する情報</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
          <li>投稿・通報の入力内容</li>
          <li>アクセスした公開ページのパス</li>
          <li>レート制限のためにハッシュ化されたアクセス元情報</li>
          <li>管理者ログイン時の Google アカウントのメールアドレス</li>
          <li>サーバーエラーの種類、メッセージ、発生したパス</li>
          <li>Cloudflare Turnstile による CAPTCHA 検証結果</li>
          <li>YouTube URL 補助機能で取得・保存される動画メタデータ</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">2. 利用目的</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
          <li>歌唱記録、楽曲、活動者情報の表示・検索・管理のため</li>
          <li>投稿、通報、活動者申請を受け付けるため</li>
          <li>荒らし、スパム、過度なアクセスを防止するため</li>
          <li>不具合調査、障害対応、サービス改善のため</li>
          <li>管理者認証と管理機能の提供のため</li>
          <li>問い合わせ、修正依頼、削除依頼に対応するため</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">3. アクセスログとレート制限</h2>
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            本サービスでは、利用状況の把握のため、アクセスされた公開ページのパスを保存します。管理画面、API、Next.js 内部パスなどはアクセスログの対象外です。
          </p>
          <p>
            投稿・通報・活動者申請・重複チェックなどでは、過度な利用を防ぐためにレート制限を行います。アクセス元の IP アドレスや User-Agent は、そのまま保存せず、ハッシュ化したキーとして保存します。
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">4. 外部サービスの利用</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
          <li>Google OAuth: 管理者ログインに使用します。</li>
          <li>Cloudflare Turnstile: 投稿フォーム等の CAPTCHA 検証に使用します。</li>
          <li>YouTube Data API: YouTube URL から動画タイトル、投稿日、チャンネル名などを取得する補助機能に使用します。</li>
          <li>Google Cloud / Cloud Run / Cloud SQL: サービスのホスティングとデータ保存に使用します。</li>
          <li>Google AdSense: 広告配信に使用します。</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">5. 広告配信について</h2>
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            本サービスは、第三者配信の広告サービス「Google AdSense」を利用しています。
          </p>
          <p>
            Google などの第三者配信事業者は Cookie を使用し、ユーザーの本サービスや他のウェブサイトへの過去のアクセス情報に基づいて、パーソナライズされた広告を配信することがあります。
          </p>
          <p>
            ユーザーは
            <a
              href="https://adssettings.google.com/"
              target="_blank"
              rel="noreferrer"
              className="mx-1 text-primary underline"
            >
              Google の広告設定
            </a>
            から、パーソナライズ広告を無効にできます。Google による広告 Cookie の利用の詳細は
            <a
              href="https://policies.google.com/technologies/ads?hl=ja"
              target="_blank"
              rel="noreferrer"
              className="mx-1 text-primary underline"
            >
              Google のポリシーと規約
            </a>
            を参照してください。
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">6. 第三者提供</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          法令に基づく場合、本人の同意がある場合、サービス運営に必要な委託先に取り扱いを委託する場合を除き、取得した情報を第三者に提供しません。
        </p>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">7. 情報の修正・削除</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          掲載情報の修正・削除、または本ポリシーに関する問い合わせは、
          <Link href="/contact" className="mx-1 text-primary underline">
            問い合わせページ
          </Link>
          から連絡してください。内容を確認したうえで、必要に応じて対応します。
        </p>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">8. ポリシーの変更</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          管理者は、必要に応じて本ポリシーを変更できます。変更後の内容は、本ページに掲載した時点で効力を生じます。
        </p>
      </section>
    </div>
  );
}
