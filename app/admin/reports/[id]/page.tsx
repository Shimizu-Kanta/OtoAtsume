import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  contentStatusLabel,
  coverTypeLabel,
  reportReasonLabel,
  reportStatusOptions
} from "@/lib/constants";
import { getReport } from "@/lib/data/admin";
import { formatDate, formatDateTime } from "@/lib/utils";
import { requireAdminPage } from "@/lib/auth/admin";
import { hideReportedCoverAction, updateReportStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminReportDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    notFound();
  }

  const updateAction = updateReportStatusAction.bind(null, report.id);
  const hideAction = hideReportedCoverAction.bind(null, report.id, report.coverId);

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="通報詳細" description={formatDateTime(report.createdAt)} />

      <section className="rounded-md border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{reportReasonLabel(report.reason)}</Badge>
          <Badge variant="outline">{report.status}</Badge>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm">{report.memo ?? "詳細メモなし"}</p>
      </section>

      <section className="rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">対象カバー記録</h2>
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <Link href={`/covers/${report.cover.id}`} className="font-medium text-primary underline">
              {report.cover.song.title}
            </Link>
          </p>
          <p className="text-muted-foreground">
            {report.cover.performers.map(({ performer }) => performer.name).join(", ")} /{" "}
            {formatDate(report.cover.performedAt)} / {coverTypeLabel(report.cover.coverType)}
          </p>
          <p className="text-muted-foreground">状態: {contentStatusLabel(report.cover.status)}</p>
          <a href={report.cover.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-primary underline">
            {report.cover.sourceUrl}
          </a>
          <div className="pt-3">
            <Link
              href={`/admin/covers/${report.cover.id}`}
              className="inline-flex rounded-md border px-3 py-2 text-sm"
            >
              対象カバー記録を編集
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-md border bg-card p-5">
        <h2 className="text-lg font-semibold">対応</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={updateAction} className="flex items-end gap-2">
            <Select name="status" defaultValue={report.status} aria-label="通報ステータス">
              {reportStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline">
              通報ステータス更新
            </Button>
          </form>
          <form action={hideAction}>
            <Button type="submit" variant="destructive">
              対象記録を非表示にして解決
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
