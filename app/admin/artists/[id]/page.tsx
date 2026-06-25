import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminArtist } from "@/lib/data/admin";
import { getSearchParam } from "@/lib/utils";
import { updateArtistAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminArtistEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const artist = await getAdminArtist(id);

  if (!artist) {
    notFound();
  }

  const action = updateArtistAction.bind(null, artist.id);
  const error = getSearchParam(query, "error");
  const updated = getSearchParam(query, "updated") === "1";

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="アーティスト編集" description={`紐づく楽曲 ${artist._count.songs} 件`} />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}
      {updated ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          アーティストを更新しました。
        </div>
      ) : null}

      <form action={action} className="rounded-md border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="name">アーティスト名</Label>
          <Input id="name" name="name" defaultValue={artist.name} required />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">更新する</Button>
          <Link href="/admin/artists" className="rounded-md border px-4 py-2 text-sm">
            一覧に戻る
          </Link>
        </div>
      </form>
    </div>
  );
}
