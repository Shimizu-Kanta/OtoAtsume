import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "おとあつめについて",
  description:
    "おとあつめは、VTuber・配信者・歌い手の歌ってみた・歌枠・ライブ歌唱の記録を集める集合知型データベースです。サービスの目的、設計思想、収録基準、運営者情報を掲載しています。",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    url: "/about",
    siteName: "おとあつめ",
    title: "おとあつめについて",
    description: "おとあつめの目的・設計思想・収録基準・運営者情報について。"
  }
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeading
        title="おとあつめについて"
        description="おとあつめが目指していることと、その仕組みについて説明します。"
      />

      <section className="space-y-3 rounded-md border bg-card p-6 leading-8 text-foreground">
        <h2 className="text-lg font-semibold">解決したい課題</h2>
        <p className="text-sm leading-8 text-muted-foreground">
          VTuberや配信者、歌い手による歌唱は、いまや歌ってみた動画・歌枠配信・ライブイベントなど、さまざまな形で日々生まれています。しかし、その多くは長時間の配信アーカイブの一部として存在しているため、「この人がこの曲を歌ったのはいつだったか」「あの曲を歌っているのは誰か」を後から探そうとしても、目的の場面にたどり着くのは簡単ではありません。数時間におよぶ歌枠のどこで何を歌ったのかは、視聴した人の記憶やコメント欄の断片的な情報に頼るしかなく、時間が経つほど検索性は失われていきます。おとあつめは、こうした「歌唱の記録が配信アーカイブに埋もれて検索できない」という課題を解決するために作られた、歌唱記録に特化したデータベースです。
        </p>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-6">
        <h2 className="text-lg font-semibold">集合知型データベースという設計</h2>
        <p className="text-sm leading-8 text-muted-foreground">
          おとあつめは、運営者だけがデータを登録するのではなく、そのとき歌唱を見た人・知っている人が少しずつ記録を持ち寄る「集合知型」の設計を採っています。誰か一人がすべての配信を追い続けることは現実的ではありませんが、多くの人がそれぞれ知っている歌唱を一件ずつ登録していけば、全体として網羅性の高いデータベースが育っていきます。登録された情報は、楽曲名・活動者名・原曲アーティスト名・歌唱日・情報元URLといった構造化されたデータとして蓄積され、あとから誰でも自由に検索・閲覧できます。1つの配信に複数の楽曲が含まれる歌枠のようなケースも、同じ情報元URLに複数の歌唱記録を紐づけることで、セットリストとして扱えるようにしています。
        </p>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-6">
        <h2 className="text-lg font-semibold">一般ユーザー登録を設けていない理由</h2>
        <p className="text-sm leading-8 text-muted-foreground">
          おとあつめには、一般利用者向けのアカウント登録やログイン機能がありません。これは意図的な設計です。おとあつめが集めたいのはあくまで「歌唱という事実の記録」であり、投稿者が誰であるか、どれだけ投稿したか、といった投稿者中心の指標ではありません。ニックネームや投稿履歴、フォロー、いいね、コメントといった機能を持たないことで、SNS的な承認欲求や人間関係の力学から距離を置き、データそのものの正確さと中立性に集中できるようにしています。登録も通報も活動者の申請も、ログインなしで誰でも行えます。そのぶん荒らしやスパムへの対策として、内容の確認や通報の仕組み、アクセス頻度の制限などを設けています。
        </p>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-6">
        <h2 className="text-lg font-semibold">収録対象と収録対象外</h2>
        <p className="text-sm leading-8 text-muted-foreground">
          おとあつめが収録するのは、一般に確認できる公開情報にもとづく歌唱記録です。具体的には、公開されている歌ってみた動画、公開配信での歌枠、公式に告知されたライブ・イベントでの歌唱などが対象になります。登録の際には、その歌唱を確認できる情報元URL（動画・配信・公式情報など）を必ず添えていただく方針です。
        </p>
        <p className="text-sm leading-8 text-muted-foreground">
          一方で、メンバーシップ限定配信や有料コンテンツなど、一般に公開されていない場での歌唱は収録対象外とします。また、公開情報であっても、本人や権利者が記録として残すことを望まないことが明らかな場合には、通報や削除依頼を通じて対応します。おとあつめは歌唱の「事実の記録」を目的としており、動画そのものの複製・再配布や、配信内容の書き起こしを行うものではありません。動画タイトルなどは情報元へのリンクとして最小限に用いるにとどめています。
        </p>
      </section>

      <section className="space-y-3 rounded-md border bg-card p-6">
        <h2 className="text-lg font-semibold">運営者情報・お問い合わせ</h2>
        <p className="text-sm leading-8 text-muted-foreground">
          おとあつめは個人により運営されている非公式のファンデータベースであり、掲載している活動者・グループ・楽曲の権利者とは関係がありません。掲載情報の修正・削除のご依頼、その他のお問い合わせは、
          <Link href="/contact" className="mx-1 text-primary underline underline-offset-4">
            問い合わせページ
          </Link>
          からご連絡ください。内容を確認のうえ、必要に応じて対応します。個人情報の取り扱いについては
          <Link href="/privacy" className="mx-1 text-primary underline underline-offset-4">
            プライバシーポリシー
          </Link>
          を、利用にあたっての条件については
          <Link href="/terms" className="mx-1 text-primary underline underline-offset-4">
            利用規約
          </Link>
          をご確認ください。
        </p>
      </section>
    </div>
  );
}
