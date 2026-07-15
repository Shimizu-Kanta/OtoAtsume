import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Shuffle, Users } from "lucide-react";

import { Breadcrumb } from "@/components/breadcrumb";
import { CoverCard } from "@/components/covers/cover-card";
import { CoverCarousel } from "@/components/home/cover-carousel";
import { PerformerCard } from "@/components/performers/performer-card";
import { buttonVariants } from "@/components/ui/button";
import type { CoverListItem } from "@/lib/data/covers";
import {
  getGroupById,
  getGroupCoverCount,
  getGroupLatestCovers,
  getGroupRandomCovers
} from "@/lib/data/groups";
import { getGroupPerformerCount, getGroupPerformers } from "@/lib/data/performers";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const group = await getGroupById(id);

  if (!group) {
    return {
      title: "グループ情報が見つかりません"
    };
  }

  const [performerCount, coverCount] = await Promise.all([
    getGroupPerformerCount(group.id),
    getGroupCoverCount(group.id)
  ]);
  const title = group.name;
  const description = `${group.name}所属の活動者${performerCount}名の歌唱記録${coverCount}件を掲載。歌ってみた・歌枠・ライブでの歌唱記録をまとめています。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/groups/${group.id}`
    },
    openGraph: {
      type: "website",
      url: `/groups/${group.id}`,
      siteName: "おとあつめ",
      title,
      description
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = await getGroupById(id);

  if (!group) {
    notFound();
  }

  const [performers, coverCount, latestCovers, randomCovers] = await Promise.all([
    getGroupPerformers(group.id),
    getGroupCoverCount(group.id),
    getGroupLatestCovers(group.id, 12),
    getGroupRandomCovers(group.id, 6)
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { name: "ホーム", href: "/" },
          { name: "グループ", href: "/groups" },
          { name: group.name, href: `/groups/${group.id}` }
        ]}
      />

      <section className="overflow-hidden rounded-[2rem] border border-primary/10 bg-card/90 shadow-sm">
        <div className="bg-primary/10 p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[0.24em] text-primary">GROUP</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {group.name}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                所属活動者 {performers.length} 名 / 歌唱記録 {coverCount.toLocaleString("ja-JP")} 件
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/groups" className={cn(buttonVariants({ variant: "outline" }))}>
                <Users className="size-4" aria-hidden="true" />
                グループ一覧へ
              </Link>
            </div>
          </div>
        </div>
      </section>

      <GroupCoverSection
        icon={<CalendarDays className="size-4" aria-hidden="true" />}
        title="新着カバー記録"
        description="このグループの活動者による歌唱記録を、歌唱日が新しい順に表示しています。"
        covers={latestCovers}
        emptyMessage="このグループのカバー記録はまだ登録されていません。"
      />

      <GroupCoverSection
        icon={<Shuffle className="size-4" aria-hidden="true" />}
        title="ランダムカバー"
        description="このグループの歌唱記録からランダムに表示しています。"
        covers={randomCovers}
        emptyMessage="このグループのカバー記録はまだ登録されていません。"
      />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">所属活動者</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              このグループに所属する公開済みの活動者です。
            </p>
          </div>
        </div>

        {performers.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {performers.map((performer) => (
              <PerformerCard key={performer.id} performer={performer} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-primary/10 bg-card/90 p-6 text-sm text-muted-foreground shadow-sm">
            このグループに所属する活動者はまだ登録されていません。
          </div>
        )}
      </section>
    </div>
  );
}

function GroupCoverSection({
  icon,
  title,
  description,
  covers,
  emptyMessage
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  covers: CoverListItem[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {covers.length > 0 ? (
        <CoverCarousel>
          {covers.map((cover) => (
            <CoverCard key={cover.id} cover={cover} />
          ))}
        </CoverCarousel>
      ) : (
        <div className="rounded-3xl border border-primary/10 bg-card/90 p-5 text-sm text-muted-foreground shadow-sm">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
