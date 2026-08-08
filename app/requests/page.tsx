import Link from "next/link";
import { FilePlus2, Sparkles } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { RankingTabs } from "@/components/ranking-tabs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AddToWatchlistButton } from "@/components/watchlist/add-to-watchlist-button";
import { getSongRequestRanking, type SongRequestFilter } from "@/lib/data/song-request-log";
import { cn, getSearchParam } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
// 「気になる曲」への追加が短時間で反映されるよう、キャッシュは短めにする
// （レコード数が少なくクエリも軽いため、コスト影響はほぼない）。
export const revalidate = 60;

export const metadata: Metadata = {
  title: "気になる曲ランキング",
  description:
    "直近7日間に「気になる曲」として追加された楽曲を匿名で集計しています。多くの人が歌ってほしいと思っている楽曲がわかります。",
  alternates: { canonical: "/requests" },
  openGraph: {
    type: "website",
    url: "/requests",
    siteName: "おとあつめ",
    title: "気になる曲ランキング",
    description: "直近7日間に「気になる曲」として追加された楽曲のランキングです。"
  }
};

function normalizeFilter(value: string | undefined): SongRequestFilter {
  return value === "unregistered" ? "unregistered" : "all";
}

export default async function RequestsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = normalizeFilter(getSearchParam(params, "filter"));
  const ranking = await getSongRequestRanking(filter, 20);

  return (
    <div className="space-y-6">
      <PageHeading
        title="気になる曲ランキング"
        description="直近7日間に「気になる曲」として追加された楽曲を匿名で集計しています。多くの人が歌ってほしいと思っている楽曲がわかります。8日以上前の記録は自動的に対象から外れます。"
      />

      <RankingTabs active="requests" />

      <div className="flex flex-wrap gap-2">
        <FilterLink current={filter} value="all" label="すべて" />
        <FilterLink current={filter} value="unregistered" label="未登録のみ" />
      </div>

      {ranking.length > 0 ? (
        <ol className="overflow-hidden rounded-[4px] border border-rule bg-panel divide-y divide-rule">
          {ranking.map((item, index) => {
            const rank = index + 1;
            const top3 = rank <= 3;

            return (
              <li
                key={item.key}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    className={cn(
                      "w-8 shrink-0 text-center font-mono text-xl font-semibold tabular-nums",
                      top3 ? "text-[color:var(--aqua-deep)]" : "text-[color:var(--slate-light)]"
                    )}
                  >
                    {rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.songId ? (
                        <Link
                          href={`/songs/${item.songId}`}
                          className="font-semibold text-ink underline-offset-4 hover:text-[color:var(--aqua-deep)] hover:underline"
                        >
                          {item.songName}
                        </Link>
                      ) : (
                        <span className="font-semibold text-ink">{item.songName}</span>
                      )}
                      {item.songId ? null : <Badge variant="accent">まだ登録されていません</Badge>}
                    </div>
                    {item.artistName ? (
                      <p className="truncate text-sm text-[color:var(--slate-light)]">{item.artistName}</p>
                    ) : null}
                    {item.songId ? (
                      <p className="mt-0.5 text-xs text-slate">
                        歌唱記録 {(item.coverCount ?? 0).toLocaleString("ja-JP")}件
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3 pl-12 sm:pl-0">
                  <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                    {item.requestCount.toLocaleString("ja-JP")}人が追加
                  </span>
                  {item.songId ? (
                    <AddToWatchlistButton
                      songName={item.songName}
                      artistName={item.artistName}
                      songId={item.songId}
                      knownCoverCount={item.coverCount ?? 0}
                      className="h-9 px-3 text-xs"
                    />
                  ) : (
                    <Link
                      href="/covers/new"
                      className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3 text-xs")}
                    >
                      <FilePlus2 className="size-4" aria-hidden="true" />
                      歌唱記録を登録
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="flex items-start gap-2 rounded-[4px] border border-rule bg-panel p-6 text-sm text-slate">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            {filter === "unregistered"
              ? "直近7日間で、未登録の曲が「気になる曲」に追加された記録はまだありません。"
              : "直近7日間で「気になる曲」に追加された記録はまだありません。"}
          </p>
        </div>
      )}
    </div>
  );
}

function FilterLink({
  current,
  value,
  label
}: {
  current: SongRequestFilter;
  value: SongRequestFilter;
  label: string;
}) {
  const active = current === value;

  return (
    <Link
      href={value === "all" ? "/requests" : `/requests?filter=${value}`}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-[3px] border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-ink bg-ink text-white"
          : "border-rule bg-transparent text-slate hover:bg-[#FAFCFD] hover:text-ink"
      )}
    >
      {label}
    </Link>
  );
}
