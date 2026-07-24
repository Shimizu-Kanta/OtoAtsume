import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Database, Music, Music2, Users } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { coverTypeLabel } from "@/lib/constants";
import { getSiteStats } from "@/lib/data/stats";
import type { Metadata } from "next";

// Docker build（builder ステージ）は DATABASE_URL に到達できないため、
// ビルド時のプリレンダーを避ける。集計は unstable_cache で1時間キャッシュする。
export const dynamic = "force-dynamic";

const getCachedSiteStats = unstable_cache(getSiteStats, ["site-stats"], { revalidate: 3600 });

export const metadata: Metadata = {
  title: "データベース統計",
  description:
    "おとあつめに登録されている歌唱記録・楽曲・活動者・アーティストの総数や、歌唱種別・年別・月別の推移などのデータベース統計です。",
  alternates: { canonical: "/stats" },
  openGraph: {
    type: "website",
    url: "/stats",
    siteName: "おとあつめ",
    title: "データベース統計",
    description: "おとあつめのデータベース統計です。"
  }
};

export default async function StatsPage() {
  const stats = await getCachedSiteStats();
  const maxYearly = Math.max(1, ...stats.yearlyBreakdown.map((item) => item.count));
  const maxMonthly = Math.max(1, ...stats.monthlyRegistrations.map((item) => item.count));

  return (
    <div className="space-y-8">
      <PageHeading
        title="データベース統計"
        description="おとあつめに登録されている公開済みデータの集計です。数値は登録内容の更新に応じて自動的に反映されます。"
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Database} label="歌唱記録" value={stats.totals.coverCount} />
        <StatCard icon={Music} label="楽曲" value={stats.totals.songCount} />
        <StatCard icon={Users} label="活動者" value={stats.totals.performerCount} />
        <StatCard icon={Music2} label="原曲アーティスト" value={stats.totals.artistCount} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">歌唱種別ごとの記録数</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          登録されている{stats.totals.coverCount.toLocaleString("ja-JP")}件の歌唱記録を種別ごとに集計しました。歌ってみた動画・歌枠・ライブなど、どの形式の歌唱が多く記録されているかを示しています。
        </p>
        <div className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">歌唱種別</th>
                <th className="p-3 text-right font-medium">記録数</th>
              </tr>
            </thead>
            <tbody>
              {stats.coverTypeBreakdown.map((item) => (
                <tr key={item.type} className="border-b last:border-b-0">
                  <td className="p-3">{coverTypeLabel(item.type)}</td>
                  <td className="p-3 text-right font-semibold">{item.count.toLocaleString("ja-JP")}件</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">年別の歌唱記録数</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          歌唱日をもとに、各年に何件の歌唱が記録されているかを集計しました。過去の歌唱をさかのぼって登録できるため、必ずしも登録日とは一致しません。
        </p>
        <div className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">年</th>
                <th className="p-3 text-right font-medium">記録数</th>
                <th className="hidden p-3 sm:table-cell">割合</th>
              </tr>
            </thead>
            <tbody>
              {stats.yearlyBreakdown.map((item) => (
                <tr key={item.year} className="border-b last:border-b-0">
                  <td className="p-3">{item.year}年</td>
                  <td className="p-3 text-right font-semibold">{item.count.toLocaleString("ja-JP")}件</td>
                  <td className="hidden p-3 sm:table-cell">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 rounded-full bg-primary/60"
                        style={{ width: `${Math.round((item.count / maxYearly) * 100)}%`, minWidth: 4 }}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">月別の新規登録数（直近12ヶ月）</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          直近12ヶ月間に新しく登録された歌唱記録の件数を月別に集計しました。登録がなかった月も0件として並べています。
        </p>
        <div className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">月</th>
                <th className="p-3 text-right font-medium">新規登録</th>
                <th className="hidden p-3 sm:table-cell">割合</th>
              </tr>
            </thead>
            <tbody>
              {stats.monthlyRegistrations.map((item) => (
                <tr key={item.label} className="border-b last:border-b-0">
                  <td className="p-3">{item.label}</td>
                  <td className="p-3 text-right font-semibold">{item.count.toLocaleString("ja-JP")}件</td>
                  <td className="hidden p-3 sm:table-cell">
                    <span
                      className="inline-block h-2 rounded-full bg-primary/60"
                      style={{ width: `${Math.round((item.count / maxMonthly) * 100)}%`, minWidth: 4 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        よく歌われている楽曲や活動者のランキングは
        <Link href="/rankings" className="mx-1 text-primary underline underline-offset-4">
          ランキングページ
        </Link>
        で確認できます。
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {label}
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
        {value.toLocaleString("ja-JP")}
      </p>
    </div>
  );
}
