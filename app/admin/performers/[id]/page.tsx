import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminPerformer, listGroups } from "@/lib/data/admin";
import { getSearchParam } from "@/lib/utils";
import { updatePerformerAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPerformerEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [performer, groups] = await Promise.all([getAdminPerformer(id), listGroups()]);

  if (!performer) {
    notFound();
  }

  const action = updatePerformerAction.bind(null, performer.id);
  const error = getSearchParam(query, "error");
  const updated = getSearchParam(query, "updated") === "1";
  const aliases = performer.aliases.map((alias) => alias.alias).join("\n");

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="活動者編集"
        description="活動者マスタの基本情報を編集できます。"
        actions={
          <>
            <Link href={`/performers/${performer.id}`} className="text-sm text-primary underline">
              公開画面を開く
            </Link>
            <Badge variant="outline">{performer.status}</Badge>
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
          活動者を更新しました。
        </div>
      ) : null}

      <form action={action} className="rounded-md border bg-card p-5">
        <div className="form-grid">
          <div className="space-y-2">
            <Label htmlFor="name">活動者名</Label>
            <Input id="name" name="name" defaultValue={performer.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="groupId">所属グループ</Label>
            <Select id="groupId" name="groupId" defaultValue={performer.groupId ?? ""}>
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
            <Input id="youtubeUrl" name="youtubeUrl" type="url" defaultValue={performer.youtubeUrl ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="officialUrl">公式URL</Label>
            <Input id="officialUrl" name="officialUrl" type="url" defaultValue={performer.officialUrl ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">ステータス</Label>
            <Select id="status" name="status" defaultValue={performer.status}>
              <option value="APPROVED">公開</option>
              <option value="PENDING">確認待ち</option>
              <option value="HIDDEN">非表示</option>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="aliases">別名</Label>
            <Textarea
              id="aliases"
              name="aliases"
              defaultValue={aliases}
              placeholder="1行に1件、またはカンマ区切りで入力"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">更新する</Button>
          <Link href="/admin/performers" className="rounded-md border px-4 py-2 text-sm">
            一覧に戻る
          </Link>
        </div>
      </form>
    </div>
  );
}
