import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminPerformers, listGroups } from "@/lib/data/admin";
import { getSearchParam } from "@/lib/utils";
import { createPerformerAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPerformersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();

  const query = await searchParams;
  const q = getSearchParam(query, "q");
  const deleted = getSearchParam(query, "deleted");
  const error = getSearchParam(query, "error");

  const [performers, groups] = await Promise.all([
    listAdminPerformers(q),
    listGroups()
  ]);

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="活動者管理" description="活動者マスタを追加・確認します。" />
      <form action="/admin/performers" className="rounded-md border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="q">活動者検索</Label>
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="活動者名・別名・所属・タグ・URLで検索"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">検索</Button>
            <Link href="/admin/performers" className="rounded-md border px-4 py-2 text-sm">
              条件クリア
            </Link>
          </div>
        </div>
      </form>
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
            {error}
          </div>
        ) : null}

        {deleted ? (
          <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
            活動者「{deleted}」を削除しました。
          </div>
        ) : null}

      <form action={createPerformerAction} className="rounded-md border bg-card p-5">
        <div className="form-grid">
          <div className="space-y-2">
            <Label htmlFor="name">活動者名</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="groupId">所属グループ</Label>
            <Select id="groupId" name="groupId" defaultValue="">
              <option value="">所属なし</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">YouTube URL</Label>
            <Input id="youtubeUrl" name="youtubeUrl" type="url" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="officialUrl">公式URL</Label>
            <Input id="officialUrl" name="officialUrl" type="url" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="colorCode">カラーコード</Label>
            <Input id="colorCode" name="colorCode" placeholder="#4A90E2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debutDate">デビュー日</Label>
            <Input id="debutDate" name="debutDate" type="date" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tags">タグ</Label>
            <Input id="tags" name="tags" placeholder="Vsinger;歌枠;オリ曲あり" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">ステータス</Label>
            <Select id="status" name="status" defaultValue="APPROVED">
              <option value="APPROVED">公開</option>
              <option value="PENDING">確認待ち</option>
              <option value="HIDDEN">非表示</option>
            </Select>
          </div>
        </div>
        <Button type="submit" className="mt-4">
          追加
        </Button>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        {performers.length > 0 ? (
          <div className="divide-y">
            {performers.map((performer) => (
              <div key={performer.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/performers/${performer.id}`} className="font-medium text-primary underline">
                    {performer.name}
                  </Link>
                  <Badge variant="outline">{performer.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {performer.group?.name ?? "所属なし"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {performer.colorCode ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <span
                        className="size-3 rounded-sm border"
                        style={{ backgroundColor: performer.colorCode }}
                      />
                      {performer.colorCode}
                    </span>
                  ) : null}
                  {performer.debutDate ? (
                    <span className="text-xs text-muted-foreground">
                      デビュー日: {performer.debutDate.toISOString().slice(0, 10)}
                    </span>
                  ) : null}
                  {performer.tags.map(({ tag }) => (
                    <Badge key={tag.id} variant="muted">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                {performer.youtubeUrl ? (
                  <a
                    href={performer.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-sm text-primary underline"
                  >
                    {performer.youtubeUrl}
                  </a>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/admin/performers/${performer.id}`} className="rounded-md border px-3 py-2 text-sm">
                    編集
                  </Link>
                  <Link href={`/performers/${performer.id}`} className="rounded-md border px-3 py-2 text-sm">
                    公開画面
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            該当する活動者がありません。
          </p>
        )}
      </div>
    </div>
  );
}
