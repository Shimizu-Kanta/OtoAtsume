import type { Metadata } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "使い方",
  description: "おとあつめの基本的な使い方"
};

const sections = [
  {
    title: "1. おとあつめとは",
    body: [
      "おとあつめは、VTuber、配信者、歌い手などの歌ってみた動画・歌枠・ライブ歌唱記録を集めるデータベースです。",
      "一般ユーザー登録やプロフィール機能はありません。投稿者名、投稿履歴、コメント、いいねなども表示しません。"
    ]
  },
  {
    title: "2. カバー記録を探す",
    body: [
      "トップページやカバー記録一覧から、楽曲名、活動者名、原曲アーティスト名で検索できます。",
      "活動者ページや楽曲ページから、関連するカバー記録をたどることもできます。"
    ]
  },
  {
    title: "3. カバー記録を登録する",
    body: [
      "カバー記録登録ページから、活動者、楽曲、歌唱日、元動画や配信のURLなどを登録できます。",
      "登録する内容は、公式動画、公開配信、公式サイト、公式SNS、ニュース記事など、一般に確認できる情報をもとにしてください。"
    ]
  },
  {
    title: "4. 登録できない情報",
    body: [
      "メンバー限定配信、非公開配信、削除済み動画など、一般に確認できない情報は登録しないでください。",
      "購入者以外に公開されていない有料配信・有料イベントの具体的な内容も登録対象外です。"
    ]
  },
  {
    title: "5. 誤りや問題を見つけた場合",
    body: [
      "カバー記録の誤り、重複、リンク切れ、非公開情報の掲載などを見つけた場合は、対象のカバー記録詳細ページにある通報ボタンから連絡してください。",
      "対象の記録を特定しやすいため、記録ごとの問題は通報ボタンの利用を推奨します。"
    ]
  },
  {
    title: "6. 問い合わせについて",
    body: [
      "サイト全体の不具合、表示崩れ、機能要望、利用規約・プライバシーポリシーに関する連絡は、問い合わせページのフォームから送信してください。",
      "個人情報、非公開情報、メンバー限定配信や購入者限定コンテンツの具体的な内容は入力しないでください。"
    ]
  }
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeading
        title="使い方"
        description="おとあつめの基本的な使い方と、登録できる情報のルールをまとめています。"
      />

      <section className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">まずできること</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/covers" className="text-primary underline">
            カバー記録を探す
          </Link>
          <Link href="/covers/new" className="text-primary underline">
            カバー記録を登録する
          </Link>
          <Link href="/contact" className="text-primary underline">
            問い合わせる
          </Link>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.title} className="space-y-3 rounded-md border bg-card p-5">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <div className="space-y-3 text-sm leading-7 text-muted-foreground">
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
