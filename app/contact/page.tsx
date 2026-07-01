import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "問い合わせ",
  description: "うたあつめへの問い合わせ、不具合報告、要望の案内"
};

const issueUrl = "https://github.com/Shimizu-Kanta/OtoAtsume/issues";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeading
        title="問い合わせ"
        description="サイト全体の不具合報告、機能要望、運営への連絡はこちらを確認してください。"
      />

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">カバー記録の誤り・問題について</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          既に登録されているカバー記録に誤り、重複、リンク切れ、非公開情報の掲載などがある場合は、対象のカバー記録詳細ページにある通報ボタンから連絡してください。
          対象データを特定しやすいため、記録ごとの問題は通報ボタンの利用を推奨します。
        </p>
        <Link href="/covers" className="inline-flex text-sm text-primary underline">
          カバー記録を探す
        </Link>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">活動者を追加したい場合</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          活動者が登録されていない場合は、活動者申請フォームから申請できます。活動者名、公式URL、所属グループなど、確認できる公開情報を入力してください。
        </p>
        <Link href="/performer-applications/new" className="inline-flex text-sm text-primary underline">
          活動者を申請する
        </Link>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">不具合・要望・その他の問い合わせ</h2>
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            サイト全体の不具合、表示崩れ、機能要望、利用規約・プライバシーポリシーに関する連絡は、GitHub Issues から送信してください。
          </p>
          <p>
            GitHub Issues は公開されるため、メールアドレス、電話番号、住所、氏名などの個人情報や、非公開情報は書き込まないでください。
          </p>
        </div>
        <a
          href={issueUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary underline"
        >
          GitHub Issues を開く
          <ExternalLink className="size-3" />
        </a>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">問い合わせ時に書いてほしい内容</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
          <li>対象ページのURL</li>
          <li>困っている内容、確認したい内容、または要望</li>
          <li>不具合の場合は、発生した画面、操作手順、利用しているブラウザ</li>
          <li>必要に応じて、内容を確認できる公式サイト、公式SNS、動画、ニュース記事などのURL</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">対応について</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          連絡内容を確認したうえで、必要に応じて対応、または今後の改善として検討します。すべての問い合わせへの個別返信や対応を保証するものではありません。
        </p>
      </section>
    </div>
  );
}
