import { MasterDataStatus } from "@prisma/client";
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
import { formatDateInput, getSearchParam } from "@/lib/utils";
import { approvePerformerAction, deletePerformerAction, updatePerformerAction } from "./actions";

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
  const approveAction = approvePerformerAction.bind(null, performer.id);
  const deleteAction = deletePerformerAction.bind(null, performer.id);
  const error = getSearchParam(query, "error");
  const updated = getSearchParam(query, "updated") === "1";
  const approved = getSearchParam(query, "approved") === "1";
  const aliases = performer.aliases.map((alias) => alias.alias).join("\n");
  const tags = performer.tags.map(({ tag }) => tag.name).join(";");

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
      {approved ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          活動者を承認しました。
        </div>
      ) : null}

      {performer.status === MasterDataStatus.PENDING ? (
        <section className="rounded-md border border-primary/30 bg-primary/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">確認待ち活動者</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                内容に問題がなければ、この活動者を公開状態にできます。
              </p>
            </div>
            <form action={approveAction}>
              <Button type="submit">承認して公開する</Button>
            </form>
          </div>
        </section>
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
            <Label htmlFor="colorCode">カラーコード</Label>
            <Input
              id="colorCode"
              name="colorCode"
              defaultValue={performer.colorCode ?? ""}
              placeholder="#4A90E2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debutDate">デビュー日</Label>
            <Input
              id="debutDate"
              name="debutDate"
              type="date"
              defaultValue={performer.debutDate ? formatDateInput(performer.debutDate) : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday">誕生日</Label>
            <Input
              id="birthday"
              name="birthday"
              type="text"
              defaultValue={performer.birthday ? formatBirthdayInput(performer.birthday) : ""}
              placeholder="05-01"
            />
            <p className="text-xs text-muted-foreground">
              年は入力せず、MM-DD 形式で入力してください。保存時は自動的に 2000 年として扱います。
            </p>
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tags">タグ</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={tags}
              placeholder="Vsinger;歌枠;オリ曲あり"
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
      <section className="rounded-md border border-destructive/40 bg-destructive/10 p-5">
        <h2 className="text-lg font-semibold">危険操作</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          この活動者を削除します。削除すると、別名・タグ付けも削除されます。
          カバー記録に紐づいている場合は削除できません。
        </p>
        <p className="mt-2 text-sm">
          紐づくカバー記録:{" "}
          <span className="font-semibold">{performer._count.covers}</span> 件
        </p>

        {performer._count.covers > 0 ? (
          <p className="mt-3 text-sm text-destructive">
            この活動者はカバー記録に紐づいているため削除できません。先にカバー記録側の紐づきを修正してください。
          </p>
        ) : null}

        <form action={deleteAction} className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="confirmName">
              削除するには活動者名「{performer.name}」を入力してください
            </Label>
            <Input
              id="confirmName"
              name="confirmName"
              placeholder={performer.name}
              disabled={performer._count.covers > 0}
              required
            />
          </div>

          <Button
            type="submit"
            variant="destructive"
            disabled={performer._count.covers > 0}
          >
            活動者を削除する
          </Button>
        </form>
      </section>
    </div>
  );
}

function formatBirthdayInput(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${month}-${day}`;
}