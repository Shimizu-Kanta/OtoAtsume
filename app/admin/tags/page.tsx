import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminTags } from "@/lib/data/tags";
import { getSearchParam, parsePageParam } from "@/lib/utils";
import { createTagAction, deleteTagAction, updateTagAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const page = parsePageParam(getSearchParam(params, "page"));
  const { items: tags, totalCount, totalPages } = await listAdminTags(page);
  const error = getSearchParam(params, "error");
  const updated = getSearchParam(params, "updated") === "1";
  const deleted = getSearchParam(params, "deleted") === "1";

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="タグ管理"
        description="活動者に付与するタグを管理します。タグ付与は活動者編集画面で行います。"
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}
      {updated ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          タグを更新しました。
        </div>
      ) : null}
      {deleted ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          タグを削除しました。
        </div>
      ) : null}

      <form action={createTagAction} className="rounded-md border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="name">タグ名</Label>
            <Input id="name" name="name" required maxLength={80} />
          </div>
          <Button type="submit">追加</Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        全 {totalCount.toLocaleString("ja-JP")} 件 / {page}ページ目（表示中 {tags.length} 件）
      </p>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {tags.map((tag) => {
            const action = updateTagAction.bind(null, tag.id);

            return (
              <form key={tag.id} action={action} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <Input name="name" defaultValue={tag.name} required maxLength={80} />
                <Link
                  href={`/admin/tags/${tag.id}`}
                  className="text-sm text-primary underline underline-offset-4"
                >
                  活動者 {tag._count.performers} 件
                </Link>
                <Button type="submit" variant="outline" size="sm">
                  更新
                </Button>
                <DeleteSubmitButton
                  formAction={deleteTagAction.bind(null, tag.id)}
                  size="sm"
                  disabled={tag._count.performers > 0}
                  confirmMessage={`タグ「${tag.name}」を削除します。よろしいですか？`}
                >
                  削除
                </DeleteSubmitButton>
              </form>
            );
          })}
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/tags" params={params} />
    </div>
  );
}
