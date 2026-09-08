import { unstable_cache } from "next/cache";

import { getPublicStats } from "@/lib/data/stats";

// 店頭の黒板。全ページ共通で最上部に置き、営業時間と在庫を掲示する。
// 全ページで DB を引くことになるので1時間キャッシュし、取得に失敗しても
// ページ全体を落とさないよう握りつぶす（掲示は装飾で、無くても機能に影響しない）。
const getCachedStats = unstable_cache(getPublicStats, ["store-bar-stats"], { revalidate: 3600 });

async function loadStats() {
  try {
    return await getCachedStats();
  } catch {
    return null;
  }
}

export async function StoreBar() {
  const stats = await loadStats();
  const format = (value: number) => value.toLocaleString("ja-JP");

  return (
    <div className="border-b border-board-deep bg-board">
      <div className="container-page flex flex-wrap items-center justify-between gap-3 py-[7px]">
        <p className="eyebrow-board">Oto Atsume — open 24h</p>
        {stats ? (
          <p className="font-mono text-[10px] tabular-nums tracking-[0.12em] text-board-sub">
            在庫 {format(stats.coverCount)} / 活動者 {format(stats.performerCount)} / 楽曲{" "}
            {format(stats.songCount)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
