import { AdminNav } from "@/components/admin/admin-nav";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminArtists, listAdminSongs } from "@/lib/data/admin";
import { createSongAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminSongsPage() {
  await requireAdminPage();
  const [songs, artists] = await Promise.all([listAdminSongs(), listAdminArtists()]);

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="楽曲管理" description="楽曲マスタを追加・確認します。" />

      <form action={createSongAction} className="rounded-md border bg-card p-5">
        <div className="form-grid">
          <div className="space-y-2">
            <Label htmlFor="title">楽曲名</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artistIds">原曲アーティスト</Label>
            <Select id="artistIds" name="artistIds" multiple className="min-h-32">
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="originalUrl">原曲URL</Label>
            <Input id="originalUrl" name="originalUrl" type="url" />
          </div>
        </div>
        <Button type="submit" className="mt-4">
          追加
        </Button>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {songs.map((song) => (
            <div key={song.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
              <Link href={`/admin/songs/${song.id}`} className="font-medium text-primary underline">
                {song.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {song.artists.map(({ artist }) => artist.name).join(", ") || "アーティスト未設定"}
              </p>
              {song.originalUrl ? (
                <a href={song.originalUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-primary underline">
                  {song.originalUrl}
                </a>
              ) : null}
              </div>
              <Link href={`/admin/songs/${song.id}`} className="rounded-md border px-3 py-2 text-sm">
                編集
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
