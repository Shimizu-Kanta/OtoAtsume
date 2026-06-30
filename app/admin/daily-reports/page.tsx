import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { requireAdminPage } from "@/lib/auth/admin";
import { listDailySiteReports } from "@/lib/data/daily-report";

export const dynamic = "force-dynamic";

export default async function AdminDailyReportsPage() {
  await requireAdminPage();

  const reports = await listDailySiteReports(60);

  return (
    <div>
      <AdminNav />
      <PageHeading
        title="日次レポート"
        description="Discordへ送信された日次集計の履歴を確認できます。"
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">対象日</th>
              <th className="px-4 py-3 font-medium">アクセス</th>
              <th className="px-4 py-3 font-medium">追加カバー</th>
              <th className="px-4 py-3 font-medium">新規楽曲</th>
              <th className="px-4 py-3 font-medium">エラー</th>
              <th className="px-4 py-3 font-medium">未処理通報</th>
              <th className="px-4 py-3 font-medium">確認待ち活動者</th>
              <th className="px-4 py-3 font-medium">作成日時</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-t">
                <td className="px-4 py-3 font-medium">{formatDate(report.date)}</td>
                <td className="px-4 py-3">{report.accessCount}</td>
                <td className="px-4 py-3">{report.addedCoverCount}</td>
                <td className="px-4 py-3">{report.addedSongCount}</td>
                <td className="px-4 py-3">{formatErrorCounts(report.errorCounts)}</td>
                <td className="px-4 py-3">{report.pendingReportCount}</td>
                <td className="px-4 py-3">{report.pendingPerformerCount}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(report.createdAt)}
                </td>
              </tr>
            ))}

            {reports.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                  日次レポートはまだ作成されていません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatErrorCounts(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "なし";
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, count]) => typeof count === "number" && count > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return "なし";
  }

  return entries.map(([type, count]) => `${type}: ${count}`).join(" / ");
}