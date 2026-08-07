import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { CoverRegistrationForm } from "@/components/covers/cover-registration-form";
import { PageHeading } from "@/components/page-heading";
import { requireAdminPage } from "@/lib/auth/admin";
import { getPerformerOptions } from "@/lib/data/performers";
import { getSearchParam, getSearchParamAll } from "@/lib/utils";
import { createAdminCoverAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminBulkNewCoverPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [params, performers] = await Promise.all([searchParams, getPerformerOptions()]);

  const initialSourceUrl = getSearchParam(params, "sourceUrl") ?? "";
  // 「同じURLで記録を追加」（Task 37-1）: sourceUrl + autoFetch=1 が付いている場合、
  // ページ読み込み時に自動でYouTube URL補助（動画情報取得）を実行する。
  const autoFetchMetadata = Boolean(initialSourceUrl && getSearchParam(params, "autoFetch") === "1");

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

      <CoverRegistrationForm
        mode="admin"
        performers={performers}
        initial={{
          sourceUrl: initialSourceUrl,
          sourceTitle: "",
          performedAt: getSearchParam(params, "performedAt") ?? "",
          coverType: getSearchParam(params, "coverType") ?? "COVER_VIDEO",
          performerIds: getSearchParamAll(params, "performerIds"),
          status: "APPROVED"
        }}
        autoFetchMetadata={autoFetchMetadata}
        showStatusField
        action={createAdminCoverAction}
      />
    </div>
  );
}
