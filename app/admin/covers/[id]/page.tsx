import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { PerformerPicker } from "@/components/covers/performer-picker";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormActionBar } from "@/components/admin/form-action-bar";
import { Badge } from "@/components/ui/badge";
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
import { getAdminCoverById } from "@/lib/data/covers";
import { getPerformerOptions } from "@/lib/data/performers";
import { formatDateInput, formatDateTime, getSearchParam } from "@/lib/utils";
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
    getAdminCoverById(id),
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
  const pendingReportCount = cover.reports.filter((report) => report.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ href: "/admin/covers", label: "歌唱記録" }, { label: "編集" }]}
        title="歌唱記録編集"
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
          歌唱記録を更新しました。
        </div>
      ) : null}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <form id="admin-edit-form" action={action} className="space-y-6 rounded-md border bg-card p-5">
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

        </form>

        <aside className="mt-6 space-y-4 lg:sticky lg:top-20 lg:mt-0">
          <section className="overflow-hidden rounded-md border bg-card">
            {cover.sourceVideoId ? (
              // eslint-disable-next-line @next/next/no-img-element -- 管理画面の確認用。最適化は不要
              <img
                src={`https://i.ytimg.com/vi/${encodeURIComponent(cover.sourceVideoId)}/mqdefault.jpg`}
                alt=""
                width={320}
                height={180}
                className="aspect-video w-full bg-muted object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                サムネイルなし
              </div>
            )}
            <dl className="space-y-3 p-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">情報元</dt>
                <dd className="mt-0.5">
                  <a
                    href={cover.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 text-primary hover:underline"
                  >
                    <span className="truncate">{cover.sourceTitle || cover.sourceUrl}</span>
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">登録日時</dt>
                <dd className="mt-0.5 font-mono tabular-nums">{formatDateTime(cover.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">最終更新</dt>
                <dd className="mt-0.5 font-mono tabular-nums">{formatDateTime(cover.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">この記録への通報</dt>
                <dd className="mt-0.5">
                  {cover.reports.length > 0 ? (
                    <Link href="/admin/reports?status=" className="font-medium text-primary hover:underline">
                      <span className="font-mono tabular-nums">{cover.reports.length}</span> 件
                      {pendingReportCount > 0 ? `（未対応 ${pendingReportCount} 件）` : null}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">なし</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <FormActionBar formId="admin-edit-form" backHref="/admin/covers" publicHref={`/covers/${cover.id}`} />
    </div>
  );
}
