import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminGroups } from "@/lib/data/admin";
import { createGroupAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  await requireAdminPage();
  const groups = await listAdminGroups();

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="所属グループ管理" description="活動者に紐づける所属グループを追加・編集します。" />

      <form action={createGroupAction} className="flex flex-col gap-3 rounded-md border bg-card p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="name">グループ名</Label>
          <Input id="name" name="name" required />
        </div>
        <Button type="submit">追加</Button>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {groups.map((group) => (
            <div key={group.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <Link href={`/admin/groups/${group.id}`} className="font-medium text-primary underline">
                  {group.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  活動者 {group._count.performers} 件
                </p>
              </div>
              <Link href={`/admin/groups/${group.id}`} className="rounded-md border px-3 py-2 text-sm">
                編集
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
