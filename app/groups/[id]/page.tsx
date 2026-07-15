import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Shuffle, Users } from "lucide-react";

import { CoverCard } from "@/components/covers/cover-card";
import { CoverCarousel } from "@/components/home/cover-carousel";
import { buttonVariants } from "@/components/ui/button";
import type { CoverListItem } from "@/lib/data/covers";
import {
  getGroupById,
  getGroupCoverCount,
  getGroupLatestCovers,
  getGroupRandomCovers
} from "@/lib/data/groups";
import { cn, formatDateInput } from "@/lib/utils";
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

  const coverCount = await getGroupCoverCount(group.id);
  const title = group.name;
  const description = `${group.name}所属の活動者${group.performers.length}名の歌唱記録${coverCount}件を掲載。歌ってみた・歌枠・ライブでの歌唱記録をまとめています。`;

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
      card: "summary",
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

  const [coverCount, latestCovers, randomCovers] = await Promise.all([
    getGroupCoverCount(group.id),
    getGroupLatestCovers(group.id, 12),
    getGroupRandomCovers(group.id, 6)
  ]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-primary/10 bg-card/90 shadow-sm">
        <div className="bg-primary/10 p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-[0.24em] text-primary">GROUP</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {group.name}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                所属活動者 {group.performers.length} 名 / 歌唱記録 {coverCount.toLocaleString("ja-JP")} 件
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

        {group.performers.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.performers.map((performer) => (
              <article
                key={performer.id}
                className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                style={{
                  borderTopColor: performer.colorCode ?? undefined,
                  borderTopWidth: performer.colorCode ? 4 : undefined,
                  backgroundImage: performer.colorCode
                    ? `linear-gradient(135deg, ${performer.colorCode}14, transparent 42%)`
                    : undefined
                }}
              >
                <div className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/performers/${performer.id}`}
                        className="text-lg font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {performer.name}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        歌唱記録 {performer._count.covers} 件
                        {performer.debutDate ? ` / デビュー日 ${formatDateInput(performer.debutDate)}` : ""}
                      </p>
                    </div>
                    {performer.colorCode ? (
                      <span
                        aria-label={`活動者カラー ${performer.colorCode}`}
                        className="mt-1 size-8 shrink-0 rounded-full border shadow-sm"
                        style={{ backgroundColor: performer.colorCode }}
                      />
                    ) : null}
                  </div>

                  <div className="mt-auto flex justify-end border-t pt-4">
                    <Link
                      href={`/performers/${performer.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      詳細を見る
                    </Link>
                  </div>
                </div>
              </article>
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
