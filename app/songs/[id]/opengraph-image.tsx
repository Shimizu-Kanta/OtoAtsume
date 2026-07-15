import { getSongById } from "@/lib/data/songs";
import { createBrandOgImage, OG_SIZE } from "@/lib/og";

export const alt = "おとあつめ 楽曲情報";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await getSongById(id);

  if (!song) {
    return createBrandOgImage({
      label: "SONG",
      title: "楽曲情報"
    });
  }

  const artists = song.artists.map(({ artist }) => artist.name).join(", ");

  return createBrandOgImage({
    label: "SONG",
    title: song.title,
    subtitle: artists || undefined,
    stat: `カバー記録 ${song.covers.length.toLocaleString("ja-JP")} 件`
  });
}
