import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { requireAdminPage } from "@/lib/auth/admin";
import { getPerformerOptions } from "@/lib/data/performers";
import { getSearchParam, getSearchParamAll } from "@/lib/utils";
import { BulkNewForm } from "./bulk-new-form";

export const dynamic = "force-dynamic";

export default async function AdminBulkNewCoverPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [params, performers] = await Promise.all([searchParams, getPerformerOptions()]);

  const initial = {
    sourceUrl: getSearchParam(params, "sourceUrl") ?? "",
    performedAt: getSearchParam(params, "performedAt") ?? "",
    coverType: getSearchParam(params, "coverType") ?? "KARAOKE_STREAM",
    performerIds: getSearchParamAll(params, "performerIds")
  };

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="歌唱記録の一括登録"
        description="1つの動画URLから複数曲をまとめて登録します。歌枠・ライブ・メドレーのように1つのアーカイブに複数曲が含まれる記録向けです。"
        actions={
          <Link href="/admin/covers" className="text-sm text-primary underline">
            歌唱記録管理に戻る
          </Link>
        }
      />

      <div className="rounded-md border border-accent/40 bg-accent/10 p-4 text-sm">
        タイムスタンプは <code className="rounded bg-muted px-1">mm:ss</code> または{" "}
        <code className="rounded bg-muted px-1">h:mm:ss</code> で入力します。登録後、各歌唱記録の詳細ページに
        「この配信・ライブの他の歌唱記録」としてタイムスタンプ順のセットリストが表示されます。
      </div>

      {/*
        BulkNewForm はクライアントコンポーネントで、送信成功後の状態(successInfo)を
        自身のReact stateとして保持する。「続けて追加」リンクはクエリパラメータだけが
        変わる同一ルートへの遷移のため、key を変えないと古い successInfo が残り
        フォームに戻れなくなる。クエリの内容を key にして、遷移のたびに再マウントする。
      */}
      <BulkNewForm key={JSON.stringify(params)} performers={performers} initial={initial} />
    </div>
  );
}
