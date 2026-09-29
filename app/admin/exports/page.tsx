import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { exportTargetLabels, exportTargets, type ExportTarget } from "@/lib/exports/master-data";

export const dynamic = "force-dynamic";

const targetDescriptions: Record<ExportTarget, string> = {
  songs: "曲名・アーティスト・原曲URL。原曲URLの有無で絞り込めます。",
  artists: "アーティスト名と紐づく楽曲数。",
  performers: "活動者の基本情報・所属・別名・タグ。",
  groups: "所属グループ名と所属活動者数。",
  tags: "タグ名と所属タググループ。",
  tagGroups: "タググループと含まれるタグ。",
  covers: "歌唱記録（楽曲・活動者・URL・日付・種別・状態）。",
  crawlKeywords: "歌唱記録候補の巡回キーワード。"
};

export default async function AdminExportsPage() {
  await requireAdminPage();

  const [songs, songsMissingOriginalUrl, artists, performers, groups, tags, tagGroups, covers, crawlKeywords] =
    await Promise.all([
      db.song.count(),
      db.song.count({ where: { OR: [{ originalUrl: null }, { originalUrl: "" }] } }),
      db.artist.count(),
      db.performer.count(),
      db.group.count(),
      db.tag.count(),
      db.tagGroup.count(),
      db.cover.count(),
      db.crawlKeyword.count()
    ]);
  const counts: Record<ExportTarget, number> = {
    songs,
    artists,
    performers,
    groups,
    tags,
    tagGroups,
    covers,
    crawlKeywords
  };

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="データエクスポート"
        description="登録データを CSV / JSON でダウンロードします。列名は一括インポートと共通なので、編集してそのまま取り込み直せます（CSV の複数値は ; 区切り）。"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {exportTargets.map((target) => (
          <form
            key={target}
            action="/api/admin/exports"
            method="get"
            className="space-y-4 rounded-md border bg-card p-5"
          >
            <input type="hidden" name="target" value={target} />
            <div>
              <h2 className="text-base font-semibold">
                {exportTargetLabels[target]}
                <span className="ml-2 text-sm font-normal text-muted-foreground">{counts[target]} 件</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{targetDescriptions[target]}</p>
              {target === "songs" ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  うち原曲URL未設定: {songsMissingOriginalUrl} 件
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {target === "songs" ? (
                <div className="space-y-2">
                  <Label htmlFor={`${target}-originalUrl`}>原曲URL</Label>
                  <Select id={`${target}-originalUrl`} name="originalUrl" defaultValue="all">
                    <option value="all">すべて</option>
                    <option value="missing">未設定のみ</option>
                    <option value="present">設定済みのみ</option>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor={`${target}-format`}>形式</Label>
                <Select id={`${target}-format`} name="format" defaultValue="csv">
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </Select>
              </div>
            </div>

            <Button type="submit">ダウンロード</Button>
          </form>
        ))}
      </div>
    </div>
  );
}
