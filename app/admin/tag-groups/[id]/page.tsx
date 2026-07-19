import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminTagGroupWithTags, searchAddableTagsForGroup } from "@/lib/data/tags";
import { getSearchParam } from "@/lib/utils";
import { addTagToGroupAction, removeTagFromGroupAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTagGroupDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const group = await getAdminTagGroupWithTags(id);

  if (!group) {
    notFound();
  }

  const searchQuery = getSearchParam(query, "q") ?? "";
  const candidates = searchQuery ? await searchAddableTagsForGroup(id, searchQuery) : [];
  const error = getSearchParam(query, "error");
  const added = getSearchParam(query, "added") === "1";
  const removed = getSearchParam(query, "removed") === "1";

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title={`タググループ: ${group.name}`}
        description={`このグループに所属するタグ ${group.tags.length} 個`}
        actions={
          <Link href="/admin/tag-groups" className="text-sm text-primary underline">
            グループ一覧に戻る
          </Link>
        }
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}
      {added ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          タグを追加しました。
        </div>
      ) : null}
      {removed ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          グループからタグを外しました。
        </div>
      ) : null}

      <section className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {group.tags.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">まだタグが所属していません。</p>
          ) : (
            group.tags.map(({ tag }) => (
              <form
                key={tag.id}
                action={removeTagFromGroupAction.bind(null, group.id, tag.id)}
                className="flex items-center justify-between gap-3 p-4"
              >
                <Link href={`/admin/tags/${tag.id}`} className="font-medium text-primary underline">
                  {tag.name}
                </Link>
                <DeleteSubmitButton
                  size="sm"
                  confirmMessage={`グループ「${group.name}」からタグ「${tag.name}」を外します。よろしいですか？`}
                >
                  グループから外す
                </DeleteSubmitButton>
              </form>
            ))
          )}
        </div>
      </section>

      <section className="rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">タグを追加</h2>
        <form className="mt-3 flex gap-2" action={`/admin/tag-groups/${group.id}`}>
          <Input type="text" name="q" defaultValue={searchQuery} placeholder="タグ名で検索" />
          <Button type="submit" variant="outline">
            検索
          </Button>
        </form>

        {searchQuery ? (
          <div className="mt-4 divide-y rounded-md border">
            {candidates.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                該当するタグが見つかりません（すでにこのグループに所属しているタグは候補に出ません）。
              </p>
            ) : (
              candidates.map((tag) => (
                <form
                  key={tag.id}
                  action={addTagToGroupAction.bind(null, group.id)}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <input type="hidden" name="tagId" value={tag.id} />
                  <span className="font-medium">{tag.name}</span>
                  <Button type="submit" size="sm">
                    追加
                  </Button>
                </form>
              ))
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
