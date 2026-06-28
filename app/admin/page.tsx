import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { coverTypeLabel } from "@/lib/constants";
import { getAdminDashboardStats } from "@/lib/data/stats";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPage();
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="管理者トップ"
        description={`${session.user?.email ?? ""} でログイン中`}
        actions={
          <Link href="/api/auth/signout" className={cn(buttonVariants({ variant: "outline" }))}>
            ログアウト
          </Link>
        }
      />

      <section className="grid gap-3 md:grid-cols-2">
        <Link href="/admin/reports" className="rounded-md border bg-card p-4 hover:bg-muted/50">
          <p className="text-sm text-muted-foreground">未対応通報</p>
          <p className="mt-2 text-3xl font-semibold">{stats.pendingReportCount}</p>
        </Link>
        <Link
          href="/admin/performers?status=PENDING"
          className="rounded-md border bg-card p-4 hover:bg-muted/50"
        >
          <p className="text-sm text-muted-foreground">確認待ち活動者</p>
          <p className="mt-2 text-3xl font-semibold">{stats.pendingPerformerCount}</p>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">最新登録カバー</h2>
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="divide-y">
            {stats.latestCovers.map((cover) => (
              <div key={cover.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <Link href={`/admin/covers/${cover.id}`} className="font-medium text-primary underline">
                    {cover.song.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cover.performers.map(({ performer }) => performer.name).join(", ")} /{" "}
                    {formatDate(cover.performedAt)}
                  </p>
                </div>
                <Badge variant="muted">{coverTypeLabel(cover.coverType)}</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
