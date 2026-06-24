import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  applicationStatusLabel,
  applicationStatusOptions
} from "@/lib/constants";
import { listPerformerApplications } from "@/lib/data/admin";
import { formatDateTime, getSearchParam } from "@/lib/utils";
import { requireAdminPage } from "@/lib/auth/admin";
import { ApplicationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminPerformerApplicationsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const rawStatus = getSearchParam(params, "status");
  const status = rawStatus === undefined ? "PENDING" : rawStatus;
  const applications = await listPerformerApplications(
    status && Object.values(ApplicationStatus).includes(status as ApplicationStatus)
      ? (status as ApplicationStatus)
      : undefined
  );

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="活動者申請一覧" description="一般ユーザーからの活動者申請を確認します。" />

      <form
        action="/admin/performer-applications"
        className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-end"
      >
        <Select name="status" defaultValue={status ?? ""} aria-label="申請ステータス">
          <option value="">ステータスすべて</option>
          {applicationStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button type="submit">絞り込み</Button>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {applications.map((application) => (
            <div key={application.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <Link
                  href={`/admin/performer-applications/${application.id}`}
                  className="font-medium text-primary underline"
                >
                  {application.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(application.createdAt)} / {application.group?.name ?? "所属なし・不明"} / {application.url}
                </p>
              </div>
              <Badge variant={application.status === "PENDING" ? "accent" : "muted"}>
                {applicationStatusLabel(application.status)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
