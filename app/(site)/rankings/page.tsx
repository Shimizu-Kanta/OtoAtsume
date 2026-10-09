import Link from "next/link";
import { unstable_cache } from "next/cache";
import { BarChart3 } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { RankingTabs } from "@/components/ranking-tabs";
import { getRankings } from "@/lib/data/rankings";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

// Docker build（builder ステージ）は DATABASE_URL に到達できないため、
// ビルド時のプリレンダーを避ける。集計は unstable_cache で1時間キャッシュする。
export const dynamic = "force-dynamic";

const getCachedRankings = unstable_cache(getRankings, ["rankings"], { revalidate: 3600 });

export const metadata: Metadata = {
  title: "ランキング",
  description:
    "おとあつめに登録された歌唱記録をもとにした、よく歌われている楽曲・歌唱記録数の多い活動者・原曲アーティストのランキングです。",
  alternates: { canonical: "/rankings" },
  openGraph: {
    type: "website",
    url: "/rankings",
    siteName: "おとあつめ",
    title: "ランキング",
    description: "おとあつめの歌唱記録をもとにした各種ランキングです。"
  }
};

export default async function RankingsPage() {
  const { topSongs, topPerformers, topArtists, trending } = await getCachedRankings();

  return (
    <div className="space-y-8">
      <PageHeading
        eyebrow="store chart"
        title="店内チャート"
        description="おとあつめに登録されている公開済みの歌唱記録をもとに集計したランキングです。集計は登録データの更新に応じて自動的に反映されます。"
      />

      <RankingTabs active="rankings" />

      <RankingSection
        eyebrow="top songs"
        title="最も多く歌われている楽曲 TOP20"
        intro="登録されている全期間の歌唱記録を対象に、歌唱記録の件数が多い楽曲を集計しました。歌ってみた動画・歌枠・ライブなど、種別を問わず合算しています。"
        unit="件"
        items={topSongs.map((song, index) => ({
          rank: index + 1,
          href: `/songs/${song.id}`,
          primary: song.title,
          secondary: song.artistNames || "アーティスト未設定",
          value: song.count
        }))}
      />

      <RankingSection
        eyebrow="top performers"
        title="歌唱記録数の多い活動者 TOP20"
        intro="公開済みの活動者について、紐づく歌唱記録の件数が多い順に並べました。複数人での歌唱記録も、それぞれの活動者の記録として数えています。"
        unit="件"
        items={topPerformers.map((performer, index) => ({
          rank: index + 1,
          href: `/performers/${performer.id}`,
          primary: performer.name,
          secondary: performer.groupName ?? "所属なし",
          value: performer.count
        }))}
      />

      <RankingSection
        eyebrow="top original artists"
        title="最も歌われている原曲アーティスト TOP20"
        intro="各歌唱記録の原曲アーティストを集計しました。1つの楽曲に複数のアーティストが登録されている場合は、それぞれのアーティストの記録として数えています。"
        unit="件"
        items={topArtists.map((artist, index) => ({
          rank: index + 1,
          href: `/covers?artist=${encodeURIComponent(artist.name)}`,
          primary: artist.name,
          secondary: null,
          value: artist.count
        }))}
      />

      <RankingSection
        eyebrow="trending"
        title="直近30日で記録が増えた楽曲 TOP10"
        intro="過去30日間に新しく登録された歌唱記録の件数をもとに、いま記録が増えている楽曲を集計しました。該当する記録がない場合は表示されません。"
        unit="件"
        countPrefix="+"
        items={trending.map((song, index) => ({
          rank: index + 1,
          href: `/songs/${song.id}`,
          primary: song.title,
          secondary: song.artistNames || "アーティスト未設定",
          value: song.count
        }))}
        emptyMessage="直近30日で新しく登録された歌唱記録はまだありません。"
      />

      <p className="flex items-center gap-2 text-sm text-slate">
        <BarChart3 className="size-4" aria-hidden="true" />
        データベース全体の統計は
        <Link href="/stats" className="text-stamp underline underline-offset-4">
          統計ページ
        </Link>
        で確認できます。
      </p>
    </div>
  );
}

type RankingItem = {
  rank: number;
  href: string;
  primary: string;
  secondary: string | null;
  value: number;
};

function RankingSection({
  eyebrow,
  title,
  intro,
  items,
  unit,
  countPrefix = "",
  emptyMessage
}: {
  eyebrow: string;
  title: string;
  intro: string;
  items: RankingItem[];
  unit: string;
  countPrefix?: string;
  emptyMessage?: string;
}) {
  const max = items.reduce((acc, item) => Math.max(acc, item.value), 0) || 1;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3.5">
        <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
        <span className="eyebrow-muted">{eyebrow}</span>
      </div>
      <p className="text-[13px] leading-[1.9] text-slate">{intro}</p>

      {items.length > 0 ? (
        <ol className="overflow-hidden rounded-[3px] border border-rule bg-panel shadow-lift">
          {items.map((item) => {
            const top3 = item.rank <= 3;

            return (
              <li
                key={`${item.rank}-${item.href}`}
                className="grid grid-cols-[44px_minmax(0,1fr)_80px] items-center gap-4 border-t border-rule px-4 py-3 first:border-t-0 sm:grid-cols-[56px_minmax(0,1fr)_190px_80px]"
              >
                <span
                  className={cn(
                    "font-mono text-2xl font-semibold tabular-nums",
                    top3 ? "text-stamp" : "text-[color:var(--slate-light)]"
                  )}
                >
                  {item.rank}
                </span>
                <span className="min-w-0">
                  <Link
                    href={item.href}
                    className="text-[15px] font-bold text-ink underline-offset-4 hover:text-stamp hover:underline"
                  >
                    {item.primary}
                  </Link>
                  {item.secondary ? (
                    <span className="block truncate text-xs text-[color:var(--slate-light)]">
                      {item.secondary}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className="hidden h-2 overflow-hidden rounded-full bg-rule sm:block"
                >
                  <span
                    className="block h-full bg-stamp"
                    style={{ width: `${Math.max(4, Math.round((item.value / max) * 100))}%` }}
                  />
                </span>
                <span className="text-right font-mono text-sm font-semibold tabular-nums text-ink">
                  {countPrefix}
                  {item.value.toLocaleString("ja-JP")}
                  {unit}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="rounded-[3px] border border-rule bg-panel p-6 text-sm text-slate shadow-lift">
          {emptyMessage ?? "表示できるデータがありません。"}
        </div>
      )}
    </section>
  );
}
