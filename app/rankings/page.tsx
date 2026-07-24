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
        icon={<Music2 className="size-5 text-primary" aria-hidden="true" />}
        title="最も多く歌われている楽曲 TOP20"
        intro="登録されている全期間の歌唱記録を対象に、カバー記録の件数が多い楽曲を集計しました。歌ってみた動画・歌枠・ライブなど、種別を問わず合算しています。"
        items={topSongs.map((song, index) => ({
          rank: index + 1,
          href: `/songs/${song.id}`,
          primary: song.title,
          secondary: song.artistNames || "アーティスト未設定",
          count: `${song.count}件`
        }))}
      />

      <RankingSection
        icon={<Users className="size-5 text-primary" aria-hidden="true" />}
        title="歌唱記録数の多い活動者 TOP20"
        intro="公開済みの活動者について、紐づく歌唱記録の件数が多い順に並べました。複数人での歌唱記録も、それぞれの活動者の記録として数えています。"
        items={topPerformers.map((performer, index) => ({
          rank: index + 1,
          href: `/performers/${performer.id}`,
          primary: performer.name,
          secondary: performer.groupName ?? "所属なし",
          count: `${performer.count}件`
        }))}
      />

      <RankingSection
        icon={<Disc3 className="size-5 text-primary" aria-hidden="true" />}
        title="最も歌われている原曲アーティスト TOP20"
        intro="各歌唱記録の原曲アーティストを集計しました。1つの楽曲に複数のアーティストが登録されている場合は、それぞれのアーティストの記録として数えています。"
        items={topArtists.map((artist, index) => ({
          rank: index + 1,
          href: `/covers?artist=${encodeURIComponent(artist.name)}`,
          primary: artist.name,
          secondary: null,
          count: `${artist.count}件`
        }))}
      />

      <RankingSection
        icon={<TrendingUp className="size-5 text-primary" aria-hidden="true" />}
        title="直近30日で記録が増えた楽曲 TOP10"
        intro="過去30日間に新しく登録された歌唱記録の件数をもとに、いま記録が増えている楽曲を集計しました。該当する記録がない場合は表示されません。"
        items={trending.map((song, index) => ({
          rank: index + 1,
          href: `/songs/${song.id}`,
          primary: song.title,
          secondary: song.artistNames || "アーティスト未設定",
          count: `+${song.count}件`
        }))}
        emptyMessage="直近30日で新しく登録された歌唱記録はまだありません。"
      />

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <BarChart3 className="size-4" aria-hidden="true" />
        データベース全体の統計は
        <Link href="/stats" className="text-primary underline underline-offset-4">
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
  count: string;
};

function RankingSection({
  icon,
  title,
  intro,
  items,
  emptyMessage
}: {
  icon: React.ReactNode;
  title: string;
  intro: string;
  items: RankingItem[];
  emptyMessage?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </span>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      <p className="text-sm leading-7 text-muted-foreground">{intro}</p>

      {items.length > 0 ? (
        <ol className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm">
          {items.map((item) => (
            <li key={`${item.rank}-${item.href}`} className="flex items-center gap-3 border-b p-4 last:border-b-0">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {item.rank}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  {item.primary}
                </Link>
                {item.secondary ? (
                  <p className="truncate text-sm text-muted-foreground">{item.secondary}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-semibold text-primary">{item.count}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-3xl border border-primary/10 bg-card/90 p-6 text-sm text-muted-foreground shadow-sm">
          {emptyMessage ?? "表示できるデータがありません。"}
        </div>
      )}
    </section>
  );
}
