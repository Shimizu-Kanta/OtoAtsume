import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { reportReasonLabel, reportStatusLabel, reportStatusOptions } from "@/lib/constants";
import { listReports } from "@/lib/data/admin";
import { formatDateTime, getSearchParam } from "@/lib/utils";
import { requireAdminPage } from "@/lib/auth/admin";
import { ReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const rawStatus = getSearchParam(params, "status");
  const status = rawStatus === undefined ? "PENDING" : rawStatus;
  const reports = await listReports(
    status && Object.values(ReportStatus).includes(status as ReportStatus)
      ? (status as ReportStatus)
      : undefined
  );

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="通報一覧" description="通報内容を確認し、必要に応じて対象記録を非表示にします。" />

      <form action="/admin/reports" className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-end">
        <Select name="status" defaultValue={status ?? ""} aria-label="通報ステータス">
          <option value="">ステータスすべて</option>
          {reportStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Button type="submit">絞り込み</Button>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {reports.map((report) => (
            <div key={report.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <Link href={`/admin/reports/${report.id}`} className="font-medium text-primary underline">
                  {report.cover.song.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(report.createdAt)} / {reportReasonLabel(report.reason)}
                </p>
              </div>
              <Badge variant={report.status === "PENDING" ? "accent" : "muted"}>
                {reportStatusLabel(report.status)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
