import Link from "next/link";
import { Search } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSongs } from "@/lib/data/songs";
import { cn, getSearchParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SongsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = getSearchParam(params, "q");
  const songs = await getSongs(q);

  return (
    <div className="space-y-6">
      <PageHeading title="楽曲" description="楽曲名と原曲アーティスト名で検索できます。" />

      <form action="/songs" className="flex gap-2 rounded-md border bg-card p-4">
        <Input name="q" defaultValue={q} placeholder="楽曲名・アーティスト名" />
        <button type="submit" className={cn(buttonVariants())}>
          <Search className="size-4" />
          検索
        </button>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {songs.map((song) => (
            <div key={song.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <Link href={`/songs/${song.id}`} className="font-medium text-primary underline">
                  {song.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {song.artists.map(({ artist }) => artist.name).join(", ") || "アーティスト未設定"} /{" "}
                  カバー記録 {song._count.covers} 件
                </p>
              </div>
              <Link
                href={`/songs/${song.id}`}
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
