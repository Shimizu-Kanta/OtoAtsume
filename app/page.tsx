import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";

import { CoverAlbumCard } from "@/components/covers/cover-album-card";
import { CoverCarousel } from "@/components/home/cover-carousel";
import { ListeningStation } from "@/components/home/listening-station";
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
  // 試聴機に掛ける一枚。収録曲が並ぶほうが試聴機らしいので複数曲の一枚を優先し、
  // 無ければ先頭の一枚を使う。棚と重複しないよう、選んだ一枚は入荷棚から外す。
  const stationAlbum =
    newArrivalAlbums.find((album) => album.totalTrackCount > 1) ?? newArrivalAlbums[0] ?? null;
  const arrivalShelfAlbums = stationAlbum
    ? newArrivalAlbums.filter((album) => album.key !== stationAlbum.key)
    : newArrivalAlbums;
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
    <div className="space-y-11">
      <IntroModal variant="home" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd).replace(/</g, "\\u003c") }}
      />
      {/* 店に入った瞬間の一面: 左が黒板のヒーロー、右がレジのレシート。 */}
      <section className="grid items-stretch gap-5 md:grid-cols-[1.35fr_0.65fr]">
        <div className="relative overflow-hidden rounded-[3px] bg-board p-6 shadow-board sm:px-8 sm:py-[30px]">
          <p className="eyebrow-board tracking-[0.24em]">Oto Atsume — open 24h</p>
          <h1 className="mt-4 text-3xl font-bold leading-[1.22] tracking-[-0.01em] text-board-ink sm:text-[40px]">
            <span className="block">推しの歌が、</span>
            <span className="block">一枚ずつ並ぶ店。</span>
          </h1>
          <p className="mt-4 max-w-[34rem] text-sm leading-[26px] text-[#CBD8CD]">
            VTuber・配信者・歌い手の歌ってみた・歌枠・ライブ歌唱記録を、一枚のCDのように棚に並べています。ユーザ登録なしで棚から探せます。
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Link href="/covers" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
              <Search className="size-4" />
              棚から探す
            </Link>
            <Link
              href="/covers/new"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full border-[#6E8272] text-board-ink hover:bg-white/10 hover:text-board-ink sm:w-auto"
              )}
            >
              <FilePlus2 className="size-4" />
              一枚を持ち込む（登録）
            </Link>
          </div>

          {/* 黒板の隅に薄く刷り込んだ「音」。 */}
          <p
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-6 -right-2.5 font-heading text-[120px] font-bold leading-none text-[#FBF7F1]/[0.05]"
          >
            音
          </p>
        </div>

        {/* レジのレシート。在庫の数字は等幅で刷る。 */}
        <div className="flex flex-col rounded-[3px] border border-rule bg-panel p-[22px] shadow-lift">
          <p className="eyebrow">Receipt / stock</p>
          <div className="mt-4 flex flex-col border-t border-dashed border-rule">
            <ReceiptRow label="在庫（歌唱記録）" value={stats.coverCount} />
            <ReceiptRow label="活動者" value={stats.performerCount} />
            <ReceiptRow label="楽曲" value={stats.songCount} />
          </div>
          <p className="mt-auto pt-4 font-mono text-[10px] leading-[1.9] tracking-[0.04em] text-[color:var(--slate-light)]">
            *** 在庫は登録と同時に反映されます ***
            <br />
            THANK YOU
          </p>
        </div>
      </section>

      {applicationDone ? (
        <div className="rounded-[2px] border border-dashed border-wood-dark bg-kraft p-4 text-sm font-bold text-kraft-ink">
          活動者申請を受け付けました。
        </div>
      ) : null}

      {/* 検索カウンター。 */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-ink">検索カウンター</h2>
          <span className="h-px flex-1 bg-rule" />
          <span className="eyebrow-muted">counter</span>
        </div>
        <form
          action="/covers"
          className="flex flex-wrap items-end gap-2.5 rounded-[3px] border border-rule bg-panel p-5 shadow-lift"
        >
          <CounterField label="song title" htmlFor="home-song" grow="1 1 260px">
            <Input id="home-song" name="song" placeholder="楽曲名" className="h-[46px] text-[15px]" />
          </CounterField>
          <CounterField label="performer" htmlFor="home-performer" grow="1 1 180px">
            <Input
              id="home-performer"
              name="performer"
              placeholder="活動者名"
              className="h-[46px] text-[15px]"
            />
          </CounterField>
          <CounterField label="original artist" htmlFor="home-artist" grow="1 1 180px">
            <Input
              id="home-artist"
              name="artist"
              placeholder="原曲アーティスト名"
              className="h-[46px] text-[15px]"
            />
          </CounterField>
          <button
            className={cn(buttonVariants({ variant: "board" }), "h-[46px] px-7 text-[15px]")}
            type="submit"
          >
            <Search className="size-4" />
            検索
          </button>
        </form>

        {/* URLから直接登録する導線（ジャンル仕切りの代わりにカウンター脇へ置く）。 */}
        <form
          action="/covers/new"
          className="flex flex-wrap items-center gap-2.5 rounded-[3px] border border-dashed border-wood-dark bg-panel p-4"
        >
          <input type="hidden" name="autoFetch" value="1" />
          <p className="text-[13px] text-slate">
            URLが分かっている場合は、そのまま持ち込みカウンターへ。
          </p>
          <Input
            name="sourceUrl"
            type="url"
            placeholder="追加したい楽曲URL"
            aria-label="追加したい楽曲URL"
            className="h-10 w-full flex-1 sm:w-auto sm:min-w-[240px]"
          />
          <Button type="submit" variant="secondary" className="h-10">
            URL入力
          </Button>
        </form>
      </section>

      <AnniversaryCoverSection groups={anniversaryAlbumGroups} />

      <ShelfSection
        en="new arrivals"
        title="最新入荷"
        description="最近登録された歌唱記録です。"
        albums={arrivalShelfAlbums}
        actionHref="/covers?sort=addedAtDesc"
        actionLabel="すべて見る"
      />

      <ShelfSection
        en="new releases"
        title="新譜"
        description="歌唱日が新しい歌唱記録です。"
        albums={newReleaseAlbums.items}
        actionHref="/covers"
        actionLabel="すべて見る"
      />

      {stationAlbum ? <ListeningStation album={stationAlbum} /> : null}

      <ShelfSection
        en="random pick"
        title="おすすめの一枚"
        description="登録されている歌唱記録からランダムに表示しています。"
        albums={listeningAlbums}
        representativeOnly
      />

      <SpineShelf
        en="back numbers"
        title="バックナンバー棚"
        description="古くから登録されている歌唱記録です。背表紙をクリックすると一枚を取り出せます。"
        albums={backNumberAlbums.items}
      />
    </div>
  );
}

// レシートの1行。ラベルは日本語、数値は等幅の大きな数字で刷る。
function ReceiptRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-rule py-2.5">
      <span className="text-[13px] text-slate">{label}</span>
      <span className="font-mono text-2xl font-semibold tabular-nums text-ink">
        {value.toLocaleString("ja-JP")}
      </span>
    </div>
  );
}

function CounterField({
  label,
  htmlFor,
  grow,
  children
}: {
  label: string;
  htmlFor: string;
  grow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2" style={{ flex: grow }}>
      <label htmlFor={htmlFor} className="eyebrow-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

type AnniversaryAlbumGroup = AnniversaryCoverGroup & { albums: CoverAlbum[] };

function AnniversaryCoverSection({ groups }: { groups: AnniversaryAlbumGroup[] }) {
  return (
    <section className="flex flex-col gap-3.5">
      <SectionHeading
        en="staff pick"
        title="本日の一枚"
        description="今日がデビュー記念日・誕生日の活動者の歌唱記録です。"
      />

      {groups.length > 0 ? (
        <div className="grid gap-[18px] lg:grid-cols-2">
          {groups.map((group) => (
            <section
              key={group.performer.id}
              // min-w-0: グリッドアイテムの既定は min-width:auto で min-content まで伸びる。
              // 中身が正方形ジャケット（幅から高さが決まる）なので、これが無いと幅が循環する。
              className="flex min-w-0 flex-col gap-3.5 rounded-[3px] border border-rule bg-panel p-[18px] shadow-lift"
              style={{
                borderTopColor: group.performer.colorCode ?? undefined,
                borderTopWidth: group.performer.colorCode ? 3 : undefined
              }}
            >
              <div>
                {/* 手書きのポップに見立てた赤いラベル。 */}
                <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-stamp px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] text-white">
                  {anniversaryBadgeLabel(group.anniversaryTypes)}
                </span>
                <h3 className="mt-2.5 text-[17px] font-bold leading-[1.45] text-ink">
                  {group.performer.name}の{anniversaryTypeLabel(group.anniversaryTypes)}です！
                </h3>
                <p className="mt-1.5 font-mono text-[10px] tracking-[0.06em] text-[color:var(--slate-light)]">
                  {group.performer.group?.name ?? "所属グループなし"}
                  {anniversaryDateText(group)}
                </p>
              </div>

              {group.albums.length > 0 ? (
                <CoverCarousel itemLayout="single">
                  {group.albums.map((album) => (
                    <CoverAlbumCard key={album.key} album={album} representativeOnly />
                  ))}
                </CoverCarousel>
              ) : (
                <p className="rounded-[2px] border border-dashed border-rule p-4 text-sm text-slate">
                  この活動者の歌唱記録はまだ登録されていません。
                </p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-[3px] border border-rule bg-panel p-5 text-sm text-slate shadow-lift">
          今日がデビュー日の活動者・誕生日の活動者は見つかりませんでした。
        </div>
      )}
    </section>
  );
}

// ポップに刷る英字ラベル。デビュー記念日と誕生日が重なる日はデビュー側を採る。
function anniversaryBadgeLabel(types: AnniversaryCoverGroup["anniversaryTypes"]) {
  return types.includes("debut") ? "DEBUT ANNIVERSARY" : "BIRTHDAY";
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
