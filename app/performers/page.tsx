import Link from "next/link";
import { Search, UserPlus } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPerformers } from "@/lib/data/performers";
import { cn, getSearchParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PerformersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = getSearchParam(params, "q");
  const performers = await getPerformers(q);

  return (
    <div className="space-y-6">
      <PageHeading
        title="活動者"
        description="活動者名、別名、所属グループで検索できます。"
        actions={
          <Link
            href="/performer-applications/new"
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            <UserPlus className="size-4" />
            活動者申請
          </Link>
        }
      />

      <form action="/performers" className="flex gap-2 rounded-md border bg-card p-4">
        <Input name="q" defaultValue={q} placeholder="活動者名・別名・グループ名" />
        <button type="submit" className={cn(buttonVariants())}>
          <Search className="size-4" />
          検索
        </button>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {performers.map((performer) => (
            <div key={performer.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <Link href={`/performers/${performer.id}`} className="font-medium text-primary underline">
                  {performer.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {performer.group?.name ?? "所属なし"} / 歌唱記録 {performer._count.covers} 件
                </p>
                {performer.youtubeUrl ? (
                  <a
                    href={performer.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-sm text-primary underline"
                  >
                    {performer.youtubeUrl}
                  </a>
                ) : null}
              </div>
              <Link
                href={`/performers/${performer.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
              >
                詳細
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
