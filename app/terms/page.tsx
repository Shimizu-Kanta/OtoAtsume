import type { Metadata } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "利用規約",
  description: "うたあつめの利用規約"
};

const updatedAt = "2026年7月2日";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeading
        title="利用規約"
        description="うたあつめを利用する前に確認していただきたいルールです。"
      />

      <div className="rounded-md border bg-card p-5 text-sm leading-7 text-muted-foreground">
        <p>最終更新日: {updatedAt}</p>
        <p className="mt-3">
          うたあつめは、VTuber、配信者、歌い手などの歌ってみた動画・歌枠・ライブ歌唱記録を登録・閲覧するためのデータベースサービスです。
          本サービスを利用する場合、本規約に同意したものとみなします。
        </p>
      </div>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">1. 登録できる情報</h2>
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            本サービスには、公式動画、公開配信、公式サイト、公式SNS、ニュース記事など、一般に確認できる情報源に基づく歌唱記録を登録できます。
          </p>
          <p>
            有料ライブやイベントの情報であっても、公式サイト、公式SNS、ニュース記事、配信者本人の発信などでセットリストや歌唱内容が公開されている場合は登録できます。
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">2. 登録してはいけない情報</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
          <li>メンバー限定配信、非公開配信、削除済み動画など、権利者や配信者が一般公開していない情報</li>
          <li>購入者以外に公開されていない有料配信・有料イベントの内容</li>
          <li>第三者の権利、プライバシー、名誉を侵害する情報</li>
          <li>虚偽、不正確、誤解を招く情報</li>
          <li>スパム、荒らし、宣伝、サービスの運営を妨げる内容</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">3. 投稿内容の扱い</h2>
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            投稿された情報は、管理者が確認・修正・非表示・削除することがあります。投稿内容の正確性、完全性、最新性を保証するものではありません。
          </p>
          <p>
            投稿者名、投稿者プロフィール、投稿履歴、いいね、コメントなど、投稿者個人を表示する機能は提供しません。
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">4. 情報の修正・削除依頼</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          誤情報、重複、非公開情報の掲載、権利上の問題などを見つけた場合は、対象ページの通報機能または
          <Link href="/contact" className="mx-1 text-primary underline">
            問い合わせページ
          </Link>
          から連絡してください。内容を確認したうえで、必要に応じて修正・非表示・削除を行います。
        </p>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">5. 禁止事項</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
          <li>本サービスの不正利用、過度なアクセス、スクレイピングなど運営に支障を与える行為</li>
          <li>虚偽情報、非公開情報、権利侵害のおそれがある情報を登録する行為</li>
          <li>第三者になりすます行為</li>
          <li>法令または公序良俗に反する行為</li>
          <li>その他、管理者が不適切と判断する行為</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">6. 免責事項</h2>
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            本サービスは、掲載情報の正確性、完全性、最新性、特定目的への適合性を保証しません。掲載情報の利用によって生じた損害について、管理者は責任を負いません。
          </p>
          <p>
            外部サイトへのリンク先の内容、提供状況、安全性について、管理者は責任を負いません。
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">7. 規約の変更</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          管理者は、必要に応じて本規約を変更できます。変更後の内容は、本ページに掲載した時点で効力を生じます。
        </p>
      </section>
    </div>
  );
}
