import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "ページが見つかりません"
};

// 存在しない URL の 404。ルートレイアウトの直下で描画されるため(site)レイアウトの
// ヘッダー・フッターが付かない。ここで直接描画して公開サイトの見た目に揃える。
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <div className="container-page py-8">
        <main className="min-w-0">
          <PageHeading
            eyebrow="404 Not Found"
            title="ページが見つかりません"
            description="URL が間違っているか、ページが移動・削除された可能性があります。"
          />
          <div className="rounded-md border bg-card p-6 text-sm">
            <p className="font-medium">お探しのページは棚にありませんでした。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/" className={buttonVariants()}>
                トップへ
              </Link>
              <Link href="/covers" className={buttonVariants({ variant: "secondary" })}>
                棚をみる
              </Link>
            </div>
          </div>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
