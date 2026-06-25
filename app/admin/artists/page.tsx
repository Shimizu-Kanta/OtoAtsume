import { AdminNav } from "@/components/admin/admin-nav";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminArtists } from "@/lib/data/admin";
import { createArtistAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminArtistsPage() {
  await requireAdminPage();
  const artists = await listAdminArtists();

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="アーティスト管理" description="原曲アーティストのマスタを追加・確認します。" />

      <form action={createArtistAction} className="flex flex-col gap-3 rounded-md border bg-card p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="name">アーティスト名</Label>
          <Input id="name" name="name" required />
        </div>
        <Button type="submit">追加</Button>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {artists.map((artist) => (
            <div key={artist.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <Link href={`/admin/artists/${artist.id}`} className="font-medium text-primary underline">
                  {artist.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">楽曲 {artist._count.songs} 件</p>
              </div>
              <Link href={`/admin/artists/${artist.id}`} className="rounded-md border px-3 py-2 text-sm">
                編集
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
