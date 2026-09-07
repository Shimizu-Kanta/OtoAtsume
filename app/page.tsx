import Link from "next/link";
import { Database, FilePlus2, Music, Search, Sparkles, Users } from "lucide-react";

import { CoverAlbumCard } from "@/components/covers/cover-album-card";
import { CoverCarousel } from "@/components/home/cover-carousel";
import { SectionHeading } from "@/components/home/section-heading";
import { ShelfSection } from "@/components/home/shelf-section";
import { SpineShelf } from "@/components/home/spine-shelf";
import { IntroModal } from "@/components/onboarding/intro-modal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  attachTrackCounts,
  getApprovedCoverAlbums,
  getRandomCovers,
  getTodayAnniversaryCoverGroups,
  limitAlbumsPerPerformer,
  type AnniversaryCoverGroup,
  type CoverAlbum
} from "@/lib/data/covers";
import { getPublicStats } from "@/lib/data/stats";
import { absoluteUrl, siteUrl } from "@/lib/site-url";
import { cn, formatDateInput } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// トップページはサイト名だけでなく、実際に検索されるキーワードを title に含める。
// template("%s | おとあつめ")を適用させないため absolute で指定する。
export const metadata: Metadata = {
  title: {
    absolute: "おとあつめ | VTuber・歌い手の歌ってみた・歌枠 歌唱記録データベース"
  },
  description:
    "VTuber・配信者・歌い手の歌ってみた動画・歌枠・ライブでの歌唱記録を集めるデータベース。ユーザー登録なしで、楽曲・活動者・原曲アーティストから歌唱記録を探せます。",
  openGraph: {
    title: "おとあつめ | VTuber・歌い手の歌ってみた・歌枠 歌唱記録データベース"
  },
  twitter: {
    title: "おとあつめ | VTuber・歌い手の歌ってみた・歌枠 歌唱記録データベース"
  }
};

// トップページの構造化データ（WebSite: サイト内検索 / Organization: 運営者情報）。
const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "おとあつめ",
      alternateName: "OtoAtsume",
      url: siteUrl,
      inLanguage: "ja",
      description:
        "VTuber・配信者・歌い手の歌ってみた・歌枠・ライブでの歌唱記録を集めるデータベース。",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/covers?song={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "Organization",
      name: "おとあつめ",
      url: siteUrl,
      logo: absoluteUrl("/icon.png")
    }
  ]
};

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const applicationDone = params.application === "1";
  // 棚ごとのデータ取得。getApprovedCoverAlbums は1回あたり3クエリ発行する点に注意。
  const [
    newArrivalCandidates,
    newReleaseAlbums,
    backNumberAlbums,
    randomCovers,
    anniversaryCoverGroups,
    stats
  ] = await Promise.all([
    getApprovedCoverAlbums({ sort: "addedAtDesc" }, 1, 24),
    getApprovedCoverAlbums({ sort: "performedAtDesc" }, 1, 12),
    getApprovedCoverAlbums({ sort: "performedAtAsc" }, 1, 30),
    getRandomCovers(12),
    getTodayAnniversaryCoverGroups(3),
    getPublicStats()
  ]);

  // まとめて登録した日に入荷棚が1人で埋まらないよう、同一活動者は2枚までに間引く。
  const newArrivalAlbums = limitAlbumsPerPerformer(newArrivalCandidates.items, 12);
  // ランダム棚とアニバーサリー棚は CoverListItem なので、曲数バッジが機能するよう
  // CoverAlbum 形状に詰め直す（tracks は代表1曲のみ）。
  const [listeningAlbums, anniversaryAlbumGroups] = await Promise.all([
    attachTrackCounts(randomCovers),
    Promise.all(
      anniversaryCoverGroups.map(async (group) => ({
        ...group,
        albums: await attachTrackCounts(group.covers)
      }))
    )
  ]);

  return (
    <div className="space-y-10">
      <IntroModal variant="home" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="overflow-hidden rounded-[4px] border border-rule bg-panel">
        <div className="grid gap-6 p-5 md:grid-cols-[1.3fr_0.7fr] md:p-8">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--slate-light)]">
              Oto Atsume
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              <span className="block sm:inline">みんなで作る、</span>
              <span className="block sm:inline">みんなの推しの、</span>
              <span className="block">歌唱記録データベース</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              <span className="block sm:inline">VTuber、配信者、歌い手などの</span>
              <span className="block sm:inline">歌唱記録を集めるデータベースです。</span>
              <span className="block sm:inline">ユーザ登録なしで、楽曲・活動者・原曲アーティストから</span>
              <span className="block">歌唱記録を探せます。</span>
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/covers" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                <Search className="size-4" />
                歌唱記録を探す
              </Link>
              <Link href="/covers/new" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
                <FilePlus2 className="size-4" />
                歌唱記録を登録
              </Link>
            </div>
          </div>

          <div className="rounded-[4px] border border-rule bg-[color:var(--paper)] p-4">
            <p className="text-sm font-semibold text-ink">URLから登録</p>
            <p className="mt-2 text-sm leading-6 text-slate">
              追加したい動画や配信のURLが分かっている場合は、ここから登録画面に進めます。
            </p>
            <form action="/covers/new" className="mt-4 space-y-3">
              <input type="hidden" name="autoFetch" value="1" />
              <Input name="sourceUrl" type="url" placeholder="追加したい楽曲URL" />
              <Button type="submit" className="w-full">
                URL入力
              </Button>
            </form>
          </div>
        </div>
      </section>

      {applicationDone ? (
        <div className="rounded-3xl border border-secondary/40 bg-secondary/20 p-4 text-sm font-medium text-secondary-foreground shadow-sm">
          活動者申請を受け付けました。
        </div>
      ) : null}

      <section className="rounded-[4px] border border-rule bg-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search className="size-5 text-[color:var(--aqua-deep)]" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">お探しの一枚を</h2>
            <p className="text-sm text-slate">楽曲名・活動者名・原曲アーティスト名で探せます。</p>
          </div>
        </div>
        <form action="/covers" className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input name="song" placeholder="楽曲名" />
          <Input name="performer" placeholder="活動者名" />
          <Input name="artist" placeholder="原曲アーティスト名" />
          <button className={cn(buttonVariants(), "w-full")} type="submit">
            <Search className="size-4" />
            検索
          </button>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Database} label="在庫" value={stats.coverCount} />
        <StatCard icon={Users} label="活動者" value={stats.performerCount} />
        <StatCard icon={Music} label="楽曲" value={stats.songCount} />
      </section>

      <AnniversaryCoverSection groups={anniversaryAlbumGroups} />

      <ShelfSection
        title="最新入荷"
        description="最近登録された歌唱記録です。"
        albums={newArrivalAlbums}
        actionHref="/covers?sort=addedAtDesc"
        actionLabel="すべて見る"
      />

      <ShelfSection
        title="新譜"
        description="歌唱日が新しい歌唱記録です。"
        albums={newReleaseAlbums.items}
        actionHref="/covers"
        actionLabel="すべて見る"
      />

      <ShelfSection
        title="試聴コーナー"
        description="登録されている歌唱記録からランダムに表示しています。"
        albums={listeningAlbums}
        representativeOnly
      />

      <SpineShelf
        title="バックナンバー"
        description="古くから登録されている歌唱記録です。"
        albums={backNumberAlbums.items}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: number }) {
  return (
    <div className="rounded-[4px] border border-rule bg-panel p-5 transition-colors hover:border-[color:var(--aqua)]">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate">
        <Icon className="size-3.5 text-[color:var(--slate-light)]" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-3 font-mono text-4xl font-semibold tabular-nums tracking-tight text-ink">
        {value.toLocaleString("ja-JP")}
      </p>
    </div>
  );
}

type AnniversaryAlbumGroup = AnniversaryCoverGroup & { albums: CoverAlbum[] };

function AnniversaryCoverSection({ groups }: { groups: AnniversaryAlbumGroup[] }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Sparkles className="size-5 text-primary" aria-hidden="true" />}
        title="本日の一枚"
        description="今日がデビュー記念日・誕生日の活動者の歌唱記録です。"
      />

      {groups.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {groups.map((group) => (
            <section
              key={group.performer.id}
              className="overflow-hidden rounded-[4px] border border-rule bg-panel"
              style={{
                borderTopColor: group.performer.colorCode ?? undefined,
                borderTopWidth: group.performer.colorCode ? 3 : undefined
              }}
            >
              <div className="border-b border-rule p-4">
                <div className="flex items-start gap-2">
                  {group.performer.colorCode ? (
                    <span
                      aria-hidden="true"
                      className="mt-1 size-3 rounded-full border"
                      style={{ backgroundColor: group.performer.colorCode }}
                    />
                  ) : null}
                  <div>
                    <h3 className="font-semibold">
                      {group.performer.name}の{anniversaryTypeLabel(group.anniversaryTypes)}です！
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {group.performer.group?.name ?? "所属グループなし"}
                      {anniversaryDateText(group)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {group.albums.length > 0 ? (
                  <CoverCarousel itemLayout="single">
                    {group.albums.map((album) => (
                      <CoverAlbumCard key={album.key} album={album} representativeOnly />
                    ))}
                  </CoverCarousel>
                ) : (
                  <p className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                    この活動者の歌唱記録はまだ登録されていません。
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-[4px] border border-rule bg-panel p-5 text-sm text-slate">
          今日がデビュー日の活動者・誕生日の活動者は見つかりませんでした。
        </div>
      )}
    </section>
  );
}

function anniversaryTypeLabel(types: AnniversaryCoverGroup["anniversaryTypes"]) {
  if (types.includes("debut") && types.includes("birthday")) {
    return "デビュー記念日・誕生日";
  }

  if (types.includes("birthday")) {
    return "誕生日";
  }

  return "デビュー記念日";
}

function anniversaryDateText(group: AnniversaryCoverGroup) {
  const parts: string[] = [];

  if (group.anniversaryTypes.includes("debut") && group.performer.debutDate) {
    parts.push(`デビュー日 ${formatDateInput(group.performer.debutDate)}`);
  }

  if (group.anniversaryTypes.includes("birthday") && group.performer.birthday) {
    parts.push(`誕生日 ${formatBirthdayInput(group.performer.birthday)}`);
  }

  return parts.length > 0 ? ` / ${parts.join(" / ")}` : "";
}

function formatBirthdayInput(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${month}-${day}`;
}
