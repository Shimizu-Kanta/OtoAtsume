import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { applicationStatusLabel, applicationStatusOptions } from "@/lib/constants";
import { getPerformerApplication } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/utils";
import { requireAdminPage } from "@/lib/auth/admin";
import { approveApplicationAction, updateApplicationStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPerformerApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const application = await getPerformerApplication(id);

  if (!application) {
    notFound();
  }

  const approveAction = approveApplicationAction.bind(null, application.id);
  const updateAction = updateApplicationStatusAction.bind(null, application.id);

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="活動者申請詳細" description={formatDateTime(application.createdAt)} />

      <section className="rounded-md border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{application.name}</h2>
          <Badge variant="outline">{applicationStatusLabel(application.status)}</Badge>
        </div>
        <a href={application.url} target="_blank" rel="noreferrer" className="mt-3 block break-all text-primary underline">
          {application.url}
        </a>
        <p className="mt-3 text-sm text-muted-foreground">
          所属グループ: {application.group?.name ?? "所属なし・不明"}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-sm">{application.memo ?? "補足メモなし"}</p>
      </section>

      <section className="rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">対応</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          承認すると同名の活動者がない場合は新規作成し、既存の活動者がある場合は所属グループ・公式URL・ステータスを更新します。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={approveAction}>
            <Button type="submit">performers に追加して承認</Button>
          </form>
          <form action={updateAction} className="flex items-end gap-2">
            <Select name="status" defaultValue={application.status} aria-label="申請ステータス">
              {applicationStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline">
              ステータス更新
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
