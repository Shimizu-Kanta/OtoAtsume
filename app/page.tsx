import Link from "next/link";
import { Database, FilePlus2, Music, Search, Sparkles, Users } from "lucide-react";

import { CoverCard } from "@/components/covers/cover-card";
import { CoverCarousel } from "@/components/home/cover-carousel";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getLatestCovers,
  getRandomCovers,
  getTodayAnniversaryCoverGroups,
  type AnniversaryCoverGroup,
  type CoverListItem
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
  const [randomCovers, anniversaryCoverGroups, latestCovers, stats] = await Promise.all([
    getRandomCovers(6),
    getTodayAnniversaryCoverGroups(3),
    getLatestCovers(6),
    getPublicStats()
  ]);

  return (
    <div className="space-y-10">
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
                カバーを探す
              </Link>
              <Link href="/covers/new" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
                <FilePlus2 className="size-4" />
                カバー記録を登録
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
            <h2 className="font-semibold">カバー記録を検索</h2>
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
        <StatCard icon={Database} label="カバー記録" value={stats.coverCount} />
        <StatCard icon={Users} label="活動者" value={stats.performerCount} />
        <StatCard icon={Music} label="楽曲" value={stats.songCount} />
      </section>

      <AnniversaryCoverSection groups={anniversaryCoverGroups} />

      <HomeCoverSection
        title="ランダムカバー"
        description="登録されているカバー記録からランダムに表示しています。"
        covers={randomCovers}
      />

      <HomeCoverSection
        title="新着カバー記録"
        description="歌唱日が新しいカバー記録を表示しています。"
        covers={latestCovers}
        actionHref="/covers"
        actionLabel="すべて見る"
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

function AnniversaryCoverSection({ groups }: { groups: AnniversaryCoverGroup[] }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        icon={<Sparkles className="size-5 text-primary" aria-hidden="true" />}
        title="アニバーサリーカバー"
        description="今日がデビュー記念日・誕生日の活動者のカバー記録を表示しています。"
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
                {group.covers.length > 0 ? (
                  <CoverCarousel itemLayout="single">
                    {group.covers.map((cover) => (
                      <CoverCard key={cover.id} cover={cover} />
                    ))}
                  </CoverCarousel>
                ) : (
                  <p className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                    この活動者のカバー記録はまだ登録されていません。
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

function HomeCoverSection({
  title,
  description,
  covers,
  actionHref,
  actionLabel
}: {
  title: string;
  description: string;
  covers: CoverListItem[];
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="space-y-4">
      <SectionHeading
        title={title}
        description={description}
        action={
          actionHref && actionLabel ? (
            <Link href={actionHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              {actionLabel}
            </Link>
          ) : null
        }
      />

      {covers.length > 0 ? (
        <CoverCarousel>
          {covers.map((cover) => (
            <CoverCard key={cover.id} cover={cover} />
          ))}
        </CoverCarousel>
      ) : (
        <div className="rounded-[4px] border border-rule bg-panel p-5 text-sm text-slate">
          表示できるカバー記録がありません。
        </div>
      )}
    </section>
  );
}

function SectionHeading({
  icon,
  title,
  description,
  action
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
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
