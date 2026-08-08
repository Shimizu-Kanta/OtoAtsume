import { unstable_cache } from "next/cache";
import { Search } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { RankingTabs } from "@/components/ranking-tabs";
import { AddToWatchlistButton } from "@/components/watchlist/add-to-watchlist-button";
import { getRecentSongRequestRanking } from "@/lib/data/song-request-log";
import type { Metadata } from "next";

// ランキング集計は「直近7日間」の絞り込みだけで自然に古いログを除外するため、
// 物理削除を伴わない。表示は1時間キャッシュで十分な鮮度とみなす。
export const dynamic = "force-dynamic";

const getCachedRanking = unstable_cache(() => getRecentSongRequestRanking(20), ["song-request-ranking"], {
  revalidate: 3600
});

export const metadata: Metadata = {
  title: "よく探されている曲",
  description:
    "おとあつめでまだ見つからず、直近7日間でよく探されている(検索・気になる曲リストで照合できなかった)楽曲のランキングです。",
  alternates: { canonical: "/requests" },
  openGraph: {
    type: "website",
    url: "/requests",
    siteName: "おとあつめ",
    title: "よく探されている曲",
    description: "おとあつめにまだ登録されていない、直近7日間でよく探されている楽曲のランキングです。"
  }
};

export default async function RequestsPage() {
  const ranking = await getCachedRanking();

  return (
    <div className="space-y-6">
      <PageHeading
        title="よく探されている曲"
        description="楽曲検索や「気になる曲」リストの照合で見つからなかった曲を匿名で集計しています。直近7日間の件数が多い順に表示し、8日以上前の記録は自動的に対象から外れます。"
      />

      <RankingTabs active="requests" />

      {ranking.length > 0 ? (
        <ol className="overflow-hidden rounded-[4px] border border-rule bg-panel divide-y divide-rule">
          {ranking.map((item, index) => {
            const rank = index + 1;
            const top3 = rank <= 3;

            return (
              <li
                key={item.normalizedQuery}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-8 shrink-0 text-center font-mono text-xl font-semibold tabular-nums ${
                      top3 ? "text-[color:var(--aqua-deep)]" : "text-[color:var(--slate-light)]"
                    }`}
                  >
                    {rank}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{item.songName}</p>
                    {item.artistName ? (
                      <p className="truncate text-sm text-[color:var(--slate-light)]">{item.artistName}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 pl-12 sm:pl-0">
                  <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                    {item.count.toLocaleString("ja-JP")}回
                  </span>
                  <AddToWatchlistButton
                    songName={item.songName}
                    artistName={item.artistName}
                    label="気になる曲に追加"
                    className="h-9 px-3 text-xs"
                  />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="flex items-start gap-2 rounded-[4px] border border-rule bg-panel p-6 text-sm text-slate">
          <Search className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>直近7日間で、見つからなかった曲の記録はまだありません。</p>
        </div>
      )}
    </div>
  );
}
