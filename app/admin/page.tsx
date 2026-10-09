import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminEmptyRow, AdminTable, AdminTd, AdminTh, AdminTr } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { contentStatusLabel, coverTypeLabel } from "@/lib/constants";
import { listDailySiteReports } from "@/lib/data/daily-report";
import { getAdminDashboardStats } from "@/lib/data/stats";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPage();
  const [stats, dailyReports] = await Promise.all([getAdminDashboardStats(), listDailySiteReports(2)]);

  const inbox = [
    { label: "未対応の通報", count: stats.pendingReportCount, href: "/admin/reports", tone: "danger" as const },
    { label: "確認待ちの活動者", count: stats.pendingPerformerCount, href: "/admin/performers?status=PENDING" },
    { label: "歌唱記録候補", count: stats.pendingCandidateCount, href: "/admin/cover-candidates" },
    { label: "下書きの特集", count: stats.draftFeatureCount, href: "/admin/features" }
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="ダッシュボード"
        description={`${session.user?.email ?? ""} でログイン中`}
        actions={
          <>
            <Link href="/admin/covers/bulk-new" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              一括登録
            </Link>
            <Link href="/admin/features/new" className={buttonVariants({ size: "sm" })}>
              特集を書く
            </Link>
          </>
        }
      />

      <section aria-labelledby="inbox-heading" className="space-y-3">
        <h2 id="inbox-heading" className="font-sans text-sm font-semibold text-muted-foreground">
          要対応
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {inbox.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative overflow-hidden rounded-md border bg-card p-4 transition-colors hover:bg-muted/40",
                item.count === 0 && "opacity-60"
              )}
            >
              {item.count > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-1",
                    item.tone === "danger" ? "bg-destructive" : "bg-primary"
                  )}
                />
              ) : null}
              <p className="text-sm text-muted-foreground">{item.label}</p>
              {item.count > 0 ? (
                <p className="mt-1 font-mono text-3xl font-bold tabular-nums">{item.count}</p>
              ) : (
                <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  対応なし
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      <YesterdaySection reports={dailyReports} />

      <section aria-labelledby="latest-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="latest-heading" className="font-sans text-sm font-semibold text-muted-foreground">
            最新の登録
          </h2>
          <Link href="/admin/covers" className="text-sm text-primary hover:underline">
            歌唱記録一覧 →
          </Link>
        </div>
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>楽曲名</AdminTh>
              <AdminTh>活動者</AdminTh>
              <AdminTh className="hidden md:table-cell">歌唱日</AdminTh>
              <AdminTh className="hidden md:table-cell">種別</AdminTh>
              <AdminTh>状態</AdminTh>
              <AdminTh className="hidden lg:table-cell">登録日時</AdminTh>
            </tr>
          </thead>
          <tbody>
            {stats.latestCovers.map((cover) => (
              <AdminTr key={cover.id}>
                <AdminTd>
                  <Link href={`/admin/covers/${cover.id}`} className="font-medium text-primary hover:underline">
                    {cover.song.title}
                  </Link>
                </AdminTd>
                <AdminTd className="max-w-[16rem]">
                  <span
                    className="block truncate"
                    title={cover.performers.map(({ performer }) => performer.name).join(", ")}
                  >
                    {cover.performers.map(({ performer }) => performer.name).join(", ")}
                  </span>
                </AdminTd>
                <AdminTd className="hidden whitespace-nowrap font-mono tabular-nums md:table-cell">
                  {formatDate(cover.performedAt)}
                </AdminTd>
                <AdminTd className="hidden md:table-cell">
                  <Badge variant="muted">{coverTypeLabel(cover.coverType)}</Badge>
                </AdminTd>
                <AdminTd>
                  <Badge variant={cover.status === "APPROVED" ? "outline" : "muted"}>
                    {contentStatusLabel(cover.status)}
                  </Badge>
                </AdminTd>
                <AdminTd className="hidden whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground lg:table-cell">
                  {formatDateTime(cover.createdAt)}
                </AdminTd>
              </AdminTr>
            ))}
            {stats.latestCovers.length === 0 ? (
              <AdminEmptyRow colSpan={6}>歌唱記録はまだありません。</AdminEmptyRow>
            ) : null}
          </tbody>
        </AdminTable>
      </section>
    </div>
  );
}

type DailyReport = Awaited<ReturnType<typeof listDailySiteReports>>[number];

function YesterdaySection({ reports }: { reports: DailyReport[] }) {
  const [latest, previous] = reports;

  return (
    <section aria-labelledby="yesterday-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id="yesterday-heading" className="font-sans text-sm font-semibold text-muted-foreground">
          昨日の数字
          {latest ? (
            <span className="ml-2 font-mono text-xs font-normal tabular-nums">
              {latest.date.toISOString().slice(0, 10)}
            </span>
          ) : null}
        </h2>
        <Link href="/admin/daily-reports" className="text-sm text-primary hover:underline">
          日次レポート一覧 →
        </Link>
      </div>

      {latest ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "アクセス数", value: latest.accessCount, prev: previous?.accessCount },
            { label: "追加歌唱記録", value: latest.addedCoverCount, prev: previous?.addedCoverCount },
            { label: "新規楽曲", value: latest.addedSongCount, prev: previous?.addedSongCount },
            {
              label: "エラー件数",
              value: sumErrorCounts(latest.errorCounts),
              prev: previous ? sumErrorCounts(previous.errorCounts) : undefined
            }
          ].map((metric) => (
            <div key={metric.label} className="rounded-md border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-xl font-semibold tabular-nums">{metric.value}</span>
                {metric.prev !== undefined ? (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    <span className="sr-only">前日比 </span>
                    {formatDiff(metric.value - metric.prev)}
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border bg-card px-4 py-6 text-sm text-muted-foreground">
          まだ日次レポートがありません
        </p>
      )}
    </section>
  );
}

function sumErrorCounts(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }

  return Object.values(value as Record<string, unknown>).reduce<number>(
    (sum, count) => sum + (typeof count === "number" ? count : 0),
    0
  );
}

function formatDiff(diff: number) {
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `−${Math.abs(diff)}`;
  return "±0";
}
