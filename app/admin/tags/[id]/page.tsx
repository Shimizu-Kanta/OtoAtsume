import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminTagWithPerformers, searchAddablePerformersForTag } from "@/lib/data/tags";
import { getSearchParam } from "@/lib/utils";
import { addPerformerToTagAction, removePerformerFromTagAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTagDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tag = await getAdminTagWithPerformers(id);

  if (!tag) {
    notFound();
  }

  const searchQuery = getSearchParam(query, "q") ?? "";
  const candidates = searchQuery ? await searchAddablePerformersForTag(id, searchQuery) : [];
  const error = getSearchParam(query, "error");
  const added = getSearchParam(query, "added") === "1";
  const removed = getSearchParam(query, "removed") === "1";

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title={`タグ: ${tag.name}`}
        description={`このタグが付いている活動者 ${tag.performers.length} 件`}
        actions={
          <Link href="/admin/tags" className="text-sm text-primary underline">
            タグ一覧に戻る
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
          活動者を追加しました。
        </div>
      ) : null}
      {removed ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          活動者からタグを外しました。
        </div>
      ) : null}

      <section className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {tag.performers.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">まだ活動者が紐づいていません。</p>
          ) : (
            tag.performers.map(({ performer }) => (
              <form
                key={performer.id}
                action={removePerformerFromTagAction.bind(null, tag.id, performer.id)}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/performers/${performer.id}`}
                    className="font-medium text-primary underline"
                  >
                    {performer.name}
                  </Link>
                  {performer.group ? (
                    <span className="ml-2 text-sm text-muted-foreground">{performer.group.name}</span>
                  ) : null}
                </div>
                <DeleteSubmitButton
                  size="sm"
                  confirmMessage={`「${performer.name}」からタグ「${tag.name}」を外します。よろしいですか？`}
                >
                  タグを外す
                </DeleteSubmitButton>
              </form>
            ))
          )}
        </div>
      </section>

      <section className="rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">活動者を追加</h2>
        <form className="mt-3 flex gap-2" action={`/admin/tags/${tag.id}`}>
          <Input type="text" name="q" defaultValue={searchQuery} placeholder="活動者名で検索" />
          <Button type="submit" variant="outline">
            検索
          </Button>
        </form>

        {searchQuery ? (
          <div className="mt-4 divide-y rounded-md border">
            {candidates.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                該当する活動者が見つかりません（すでにこのタグが付いている活動者は候補に出ません）。
              </p>
            ) : (
              candidates.map((performer) => (
                <form
                  key={performer.id}
                  action={addPerformerToTagAction.bind(null, tag.id)}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <input type="hidden" name="performerId" value={performer.id} />
                  <div className="min-w-0">
                    <span className="font-medium">{performer.name}</span>
                    {performer.group ? (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {performer.group.name}
                      </span>
                    ) : null}
                  </div>
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
