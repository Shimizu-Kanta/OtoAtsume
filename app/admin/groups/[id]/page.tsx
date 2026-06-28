import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminGroup } from "@/lib/data/admin";
import { getSearchParam } from "@/lib/utils";
import { updateGroupAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminGroupEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const group = await getAdminGroup(id);

  if (!group) {
    notFound();
  }

  const action = updateGroupAction.bind(null, group.id);
  const error = getSearchParam(query, "error");
  const updated = getSearchParam(query, "updated") === "1";

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="所属グループ編集"
        description={`活動者 ${group._count.performers} 件が紐づいています。`}
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}
      {updated ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          所属グループを更新しました。
        </div>
      ) : null}

      <form action={action} className="rounded-md border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="name">グループ名</Label>
          <Input id="name" name="name" defaultValue={group.name} required />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">更新する</Button>
          <Link href="/admin/groups" className="rounded-md border px-4 py-2 text-sm">
            一覧に戻る
          </Link>
        </div>
      </form>
      <section className="rounded-md border bg-card">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">所属活動者</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            このグループに所属している活動者を確認できます。
          </p>
        </div>

        {group.performers.length > 0 ? (
          <div className="divide-y">
            {group.performers.map((performer) => (
              <div key={performer.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/performers/${performer.id}`} className="font-medium text-primary underline">
                      {performer.name}
                    </Link>
                    <Badge variant="outline">{performer.status}</Badge>
                    {performer.colorCode ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span
                          className="size-3 rounded-sm border"
                          style={{ backgroundColor: performer.colorCode }}
                        />
                        {performer.colorCode}
                      </span>
                    ) : null}
                  </div>

                  {performer.debutDate ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      デビュー日: {performer.debutDate.toISOString().slice(0, 10)}
                    </p>
                  ) : null}

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

                  {!performer.youtubeUrl && performer.officialUrl ? (
                    <a
                      href={performer.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-sm text-primary underline"
                    >
                      {performer.officialUrl}
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
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
            このグループに所属している活動者はいません。
          </p>
        )}
      </section>
    </div>
  );
}
