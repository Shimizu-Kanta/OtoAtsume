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
import { createPerformerAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPerformersPage() {
  await requireAdminPage();
  const [performers, groups] = await Promise.all([listAdminPerformers(), listGroups()]);

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="活動者管理" description="活動者マスタを追加・確認します。" />

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
      </div>
    </div>
  );
}
