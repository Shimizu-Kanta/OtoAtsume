import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { requireAdminPage } from "@/lib/auth/admin";
import { PlaylistImportForm } from "./playlist-import-form";

export const dynamic = "force-dynamic";

export default async function AdminPlaylistImportPage() {
  await requireAdminPage();

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="プレイリスト取り込み"
        description="YouTubeのプレイリストURLから歌唱記録候補をまとめて収集します。取得した動画は確認画面で選んだものだけが候補として登録されます。"
        actions={
          <Link href="/admin/cover-candidates" className="text-sm text-primary underline">
            歌唱記録候補に戻る
          </Link>
        }
      />

      <PlaylistImportForm />
    </div>
  );
}
