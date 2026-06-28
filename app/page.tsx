import Link from "next/link";
import { Database, FilePlus2, Search, Sparkles, UserPlus } from "lucide-react";

import { CoverCard } from "@/components/covers/cover-card";
import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getLatestCovers,
  getRandomCovers,
  getTodayAnniversaryCoverGroups,
  type AnniversaryCoverGroup,
  type CoverListItem
} from "@/lib/data/covers";
import { getPublicStats } from "@/lib/data/stats";
import { cn, formatDateInput } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
    <div className="space-y-8">
      <PageHeading
        title="うたあつめ"
        description="VTuber、配信者、歌い手などの歌ってみた動画・歌枠・ライブ歌唱記録を集めるデータベースです。一般ユーザー登録やプロフィール機能はありません。"
        actions={
          <>
            <Link href="/covers/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
              <FilePlus2 className="size-4" />
              カバー記録を登録
            </Link>
            <Link
              href="/performer-applications/new"
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              <UserPlus className="size-4" />
              活動者を申請
            </Link>
          </>
        }
      />

      {applicationDone ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          活動者申請を受け付けました。
        </div>
      ) : null}

      <section className="rounded-md border bg-card p-4">
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

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="size-4" />
            カバー記録
          </div>
          <p className="mt-2 text-2xl font-semibold">{stats.coverCount}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <div className="text-sm text-muted-foreground">活動者</div>
          <p className="mt-2 text-2xl font-semibold">{stats.performerCount}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <div className="text-sm text-muted-foreground">楽曲</div>
          <p className="mt-2 text-2xl font-semibold">{stats.songCount}</p>
        </div>
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

function AnniversaryCoverSection({ groups }: { groups: AnniversaryCoverGroup[] }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">アニバーサリーカバー</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            今日がデビュー日の活動者のカバー記録を表示しています。
          </p>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {groups.map((group) => (
            <section
              key={group.performer.id}
              className="overflow-hidden rounded-md border bg-card"
              style={{
                borderTopColor: group.performer.colorCode ?? undefined,
                borderTopWidth: group.performer.colorCode ? 4 : undefined
              }}
            >
              <div
                className="border-b p-4"
                style={{
                  background: group.performer.colorCode
                    ? `linear-gradient(135deg, ${group.performer.colorCode}1A, transparent 60%)`
                    : undefined
                }}
              >
                <div className="flex items-start gap-2">
                  {group.performer.colorCode ? (
                    <span
                      aria-hidden="true"
                      className="mt-1 size-3 rounded-full border"
                      style={{ backgroundColor: group.performer.colorCode }}
                    />
                  ) : null}
                  <div>
                    <h3 className="font-semibold">{group.performer.name}のデビュー日です！</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {group.performer.group?.name ?? "所属グループなし"}
                      {group.performer.debutDate ? ` / ${formatDateInput(group.performer.debutDate)}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                {group.covers.length > 0 ? (
                  group.covers.map((cover) => <CoverCard key={cover.id} cover={cover} />)
                ) : (
                  <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                    この活動者のカバー記録はまだ登録されていません。
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          今日がデビュー日の活動者は見つかりませんでした。
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
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="text-sm text-primary underline">
            {actionLabel}
          </Link>
        ) : null}
      </div>

      {covers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {covers.map((cover) => (
            <CoverCard key={cover.id} cover={cover} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          表示できるカバー記録がありません。
        </div>
      )}
    </section>
  );
}