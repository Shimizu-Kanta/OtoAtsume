import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminTagGroups, type AdminTagGroupSort } from "@/lib/data/tags";
import { getSearchParam, parsePageParam } from "@/lib/utils";
import { createTagGroupAction, deleteTagGroupAction, updateTagGroupAction } from "./actions";

export const dynamic = "force-dynamic";

function normalizeTagGroupSort(value: string | undefined): AdminTagGroupSort {
  return value === "nameAsc" || value === "tagCountDesc" ? value : "sortOrderAsc";
}

export default async function AdminTagGroupsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const page = parsePageParam(getSearchParam(params, "page"));
  const query = getSearchParam(params, "q") ?? "";
  const sort = normalizeTagGroupSort(getSearchParam(params, "sort"));
  const { items: groups, totalCount, totalPages } = await listAdminTagGroups({ query, sort }, page);
  const error = getSearchParam(params, "error");
  const updated = getSearchParam(params, "updated") === "1";
  const deleted = getSearchParam(params, "deleted") === "1";

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="タググループ管理"
        description="タグを種類別に分類するグループを管理します。1つのタグは複数のグループに所属できます。公開側の表示順は sortOrder（小さいほど先）で制御します。"
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}
      {updated ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          グループを更新しました。
        </div>
      ) : null}
      {deleted ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          グループを削除しました（タグ自体は削除されていません）。
        </div>
      ) : null}

      <form action="/admin/tag-groups" className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="q">グループ検索</Label>
          <Input id="q" name="q" defaultValue={query} placeholder="グループ名で検索" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort">並び替え</Label>
          <Select id="sort" name="sort" defaultValue={sort}>
            <option value="sortOrderAsc">表示順</option>
            <option value="nameAsc">名前順</option>
            <option value="tagCountDesc">所属タグ数が多い順</option>
          </Select>
        </div>
        <Button type="submit">検索</Button>
        <Link href="/admin/tag-groups" className="rounded-md border px-4 py-2 text-sm">
          条件クリア
        </Link>
      </form>

      <form action={createTagGroupAction} className="rounded-md border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="name">グループ名</Label>
            <Input id="name" name="name" required maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">表示順</Label>
            <Input id="sortOrder" name="sortOrder" type="number" defaultValue={0} />
          </div>
          <Button type="submit">追加</Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        全 {totalCount.toLocaleString("ja-JP")} 件 / {page}ページ目（表示中 {groups.length} 件）
      </p>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {groups.map((group) => (
            <form
              key={group.id}
              action={updateTagGroupAction.bind(null, group.id)}
              className="grid gap-3 p-4 md:grid-cols-[1fr_120px_auto_auto_auto] md:items-center"
            >
              <Input name="name" defaultValue={group.name} required maxLength={80} />
              <Input name="sortOrder" type="number" defaultValue={group.sortOrder} aria-label="表示順" />
              <Link
                href={`/admin/tag-groups/${group.id}`}
                className="text-sm text-primary underline underline-offset-4"
              >
                タグ {group._count.tags} 個
              </Link>
              <Button type="submit" variant="outline" size="sm">
                更新
              </Button>
              <DeleteSubmitButton
                formAction={deleteTagGroupAction.bind(null, group.id)}
                size="sm"
                confirmMessage={`グループ「${group.name}」を削除します。グループを削除してもタグは削除されません。よろしいですか？`}
              >
                削除
              </DeleteSubmitButton>
            </form>
          ))}
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/tag-groups" params={params} />
    </div>
  );
}
