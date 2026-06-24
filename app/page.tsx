import Link from "next/link";
import { Database, FilePlus2, Search, UserPlus } from "lucide-react";

import { CoverList } from "@/components/covers/cover-list";
import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLatestCovers } from "@/lib/data/covers";
import { getPublicStats } from "@/lib/data/stats";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const applicationDone = params.application === "1";
  const [latestCovers, stats] = await Promise.all([getLatestCovers(8), getPublicStats()]);

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

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">新着カバー記録</h2>
          <Link href="/covers" className="text-sm text-primary underline">
            すべて見る
          </Link>
        </div>
        <CoverList covers={latestCovers} />
      </section>
    </div>
  );
}
