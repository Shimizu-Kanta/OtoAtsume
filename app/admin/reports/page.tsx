import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminEmptyRow, AdminTable, AdminTd, AdminTh, AdminTr } from "@/components/admin/admin-table";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { reportReasonLabel, reportStatusLabel, reportStatusOptions } from "@/lib/constants";
import { listReports } from "@/lib/data/admin";
import { formatDateTime, getSearchParam, parsePageParam } from "@/lib/utils";
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
  const page = parsePageParam(getSearchParam(params, "page"));
  const statusFilter =
    status && Object.values(ReportStatus).includes(status as ReportStatus)
      ? (status as ReportStatus)
      : undefined;
  const { items: reports, totalCount, totalPages } = await listReports(statusFilter, page);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="通報一覧" description="通報内容を確認し、必要に応じて対象記録を非表示にします。" />

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

      <p className="text-sm text-muted-foreground">
        全 {totalCount.toLocaleString("ja-JP")} 件 / {page}ページ目（表示中 {reports.length} 件）
      </p>

      <AdminTable>
        <thead>
          <tr>
            <AdminTh>対象の歌唱記録</AdminTh>
            <AdminTh>理由</AdminTh>
            <AdminTh>状態</AdminTh>
            <AdminTh className="hidden md:table-cell">通報日時</AdminTh>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <AdminTr key={report.id}>
              <AdminTd className="min-w-[10rem]">
                <Link href={`/admin/reports/${report.id}`} className="font-medium text-primary hover:underline">
                  {report.cover.song.title}
                </Link>
                <p className="font-mono text-xs tabular-nums text-muted-foreground md:hidden">
                  {formatDateTime(report.createdAt)}
                </p>
              </AdminTd>
              <AdminTd className="whitespace-nowrap">{reportReasonLabel(report.reason)}</AdminTd>
              <AdminTd>
                <Badge variant={report.status === "PENDING" ? "accent" : "muted"}>
                  {reportStatusLabel(report.status)}
                </Badge>
              </AdminTd>
              <AdminTd className="hidden whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground md:table-cell">
                {formatDateTime(report.createdAt)}
              </AdminTd>
            </AdminTr>
          ))}
          {reports.length === 0 ? <AdminEmptyRow colSpan={4}>該当する通報はありません</AdminEmptyRow> : null}
        </tbody>
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/reports" params={params} />
    </div>
  );
}
