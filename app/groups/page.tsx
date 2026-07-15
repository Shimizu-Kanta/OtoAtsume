import Link from "next/link";
import { Users } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { getGroups } from "@/lib/data/groups";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "グループ",
  description:
    "VTuber・歌い手グループの一覧です。グループごとに所属活動者と歌ってみた・歌枠・ライブの歌唱記録をまとめています。",
  alternates: {
    canonical: "/groups"
  },
  openGraph: {
    type: "website",
    url: "/groups",
    siteName: "おとあつめ",
    title: "グループ",
    description: "VTuber・歌い手グループごとに所属活動者と歌唱記録をまとめています。"
  },
  twitter: {
    card: "summary",
    title: "グループ",
    description: "VTuber・歌い手グループごとに所属活動者と歌唱記録をまとめています。"
  }
};

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="space-y-6">
      <PageHeading
        title="グループ"
        description="活動者が所属するグループの一覧です。グループごとの歌唱記録や所属活動者を確認できます。"
      />

      {groups.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <article
              key={group.id}
              className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-full flex-col gap-4 p-5">
                <div className="min-w-0">
                  <Link
                    href={`/groups/${group.id}`}
                    className="text-lg font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {group.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="size-4" aria-hidden="true" />
                    所属活動者 {group._count.performers} 名
                  </p>
                </div>

                <div className="mt-auto flex justify-end border-t pt-4">
                  <Link
                    href={`/groups/${group.id}`}
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
          表示できるグループはまだ登録されていません。
        </div>
      )}
    </div>
  );
}
