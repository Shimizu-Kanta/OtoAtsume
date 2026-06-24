import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { PerformerPicker } from "@/components/covers/performer-picker";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  contentStatusLabel,
  contentStatusOptions,
  coverTypeOptions
} from "@/lib/constants";
import { requireAdminPage } from "@/lib/auth/admin";
import { getCoverById } from "@/lib/data/covers";
import { getPerformerOptions } from "@/lib/data/performers";
import { formatDateInput, getSearchParam } from "@/lib/utils";
import { updateAdminCoverAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCoverEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [cover, performerOptions] = await Promise.all([
    getCoverById(id, true),
    getPerformerOptions()
  ]);

  if (!cover) {
    notFound();
  }

  const error = getSearchParam(query, "error");
  const updated = getSearchParam(query, "updated") === "1";
  const action = updateAdminCoverAction.bind(null, cover.id);
  const artistNames = cover.song.artists.map(({ artist }) => artist.name).join(", ");
  const selectedPerformerIds = cover.performers.map(({ performerId }) => performerId);

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="カバー記録編集"
        description="楽曲、活動者、情報元、公開状態を編集できます。"
        actions={
          <>
            <Link href={`/covers/${cover.id}`} className="text-sm text-primary underline">
              公開画面を開く
            </Link>
            <Badge variant="outline">{contentStatusLabel(cover.status)}</Badge>
          </>
        }
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}
      {updated ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          カバー記録を更新しました。
        </div>
      ) : null}

      <form action={action} className="space-y-6 rounded-md border bg-card p-5">
        <section className="form-grid">
          <div className="space-y-2">
            <Label>既存の活動者</Label>
            <PerformerPicker
              performers={performerOptions}
              defaultSelectedIds={selectedPerformerIds}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="performerNames">活動者名を直接入力</Label>
            <Textarea
              id="performerNames"
              name="performerNames"
              placeholder="未登録の活動者を追加する場合のみ入力。改行・カンマ区切り対応。"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="songTitle">楽曲名</Label>
            <Input id="songTitle" name="songTitle" defaultValue={cover.song.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artistNames">原曲アーティスト名</Label>
            <Input id="artistNames" name="artistNames" defaultValue={artistNames} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="performedAt">歌唱日</Label>
            <Input
              id="performedAt"
              name="performedAt"
              type="date"
              defaultValue={formatDateInput(cover.performedAt)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverType">歌唱種別</Label>
            <Select id="coverType" name="coverType" defaultValue={cover.coverType} required>
              {coverTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <section className="form-grid">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="sourceUrl">情報元URL</Label>
            <Input id="sourceUrl" name="sourceUrl" type="url" defaultValue={cover.sourceUrl} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceTitle">配信・動画・ライブ名</Label>
            <Input id="sourceTitle" name="sourceTitle" defaultValue={cover.sourceTitle ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timestampSeconds">タイムスタンプ秒数</Label>
            <Input
              id="timestampSeconds"
              name="timestampSeconds"
              type="number"
              min="0"
              defaultValue={cover.timestampSeconds ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">ステータス</Label>
            <Select id="status" name="status" defaultValue={cover.status} required>
              {contentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">更新する</Button>
          <Link href="/admin/covers" className="rounded-md border px-4 py-2 text-sm">
            一覧に戻る
          </Link>
        </div>
      </form>
    </div>
  );
}
