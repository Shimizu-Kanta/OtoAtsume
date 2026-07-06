import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminTags } from "@/lib/data/tags";
import { getSearchParam } from "@/lib/utils";
import { createTagAction, deleteTagAction, updateTagAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTagsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [tags, params] = await Promise.all([listAdminTags(), searchParams]);
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

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {tags.map((tag) => {
            const action = updateTagAction.bind(null, tag.id);

            return (
              <form key={tag.id} action={action} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <Input name="name" defaultValue={tag.name} required maxLength={80} />
                <span className="text-sm text-muted-foreground">
                  活動者 {tag._count.performers} 件
                </span>
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
    </div>
  );
}
