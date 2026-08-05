import Link from "next/link";
import { unstable_cache } from "next/cache";
import { BarChart3, Disc3, Music2, TrendingUp, Users } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { getRankings } from "@/lib/data/rankings";
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
        title="ランキング"
        description="おとあつめに登録されている公開済みの歌唱記録をもとに集計したランキングです。集計は登録データの更新に応じて自動的に反映されます。"
      />

      <RankingSection
        icon={<Music2 className="size-5 text-[color:var(--aqua-deep)]" aria-hidden="true" />}
        title="最も多く歌われている楽曲 TOP20"
        intro="登録されている全期間の歌唱記録を対象に、カバー記録の件数が多い楽曲を集計しました。歌ってみた動画・歌枠・ライブなど、種別を問わず合算しています。"
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
        icon={<Users className="size-5 text-[color:var(--aqua-deep)]" aria-hidden="true" />}
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
        icon={<Disc3 className="size-5 text-[color:var(--aqua-deep)]" aria-hidden="true" />}
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
        icon={<TrendingUp className="size-5 text-[color:var(--aqua-deep)]" aria-hidden="true" />}
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
        <Link href="/stats" className="text-[color:var(--aqua-deep)] underline underline-offset-4">
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
  icon,
  title,
  intro,
  items,
  unit,
  countPrefix = "",
  emptyMessage
}: {
  icon: React.ReactNode;
  title: string;
  intro: string;
  items: RankingItem[];
  unit: string;
  countPrefix?: string;
  emptyMessage?: string;
}) {
  const max = items.reduce((acc, item) => Math.max(acc, item.value), 0) || 1;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-9 items-center justify-center rounded-[3px] border border-rule bg-panel">
          {icon}
        </span>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      <p className="text-sm leading-7 text-slate">{intro}</p>

      {items.length > 0 ? (
        <ol className="overflow-hidden rounded-[4px] border border-rule bg-panel divide-y divide-rule">
          {items.map((item) => {
            const top3 = item.rank <= 3;

            return (
              <li key={`${item.rank}-${item.href}`} className="flex items-center gap-4 px-4 py-3">
                <span
                  className={`w-8 shrink-0 text-center font-mono text-xl font-semibold tabular-nums ${
                    top3 ? "text-[color:var(--aqua-deep)]" : "text-[color:var(--slate-light)]"
                  }`}
                >
                  {item.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={item.href}
                    className="font-semibold text-ink underline-offset-4 hover:text-[color:var(--aqua-deep)] hover:underline"
                  >
                    {item.primary}
                  </Link>
                  {item.secondary ? (
                    <p className="truncate text-sm text-[color:var(--slate-light)]">{item.secondary}</p>
                  ) : null}
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-rule" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-[color:var(--aqua)]"
                      style={{ width: `${Math.max(4, Math.round((item.value / max) * 100))}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">
                  {countPrefix}
                  {item.value.toLocaleString("ja-JP")}
                  {unit}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="rounded-[4px] border border-rule bg-panel p-6 text-sm text-slate">
          {emptyMessage ?? "表示できるデータがありません。"}
        </div>
      )}
    </section>
  );
}
