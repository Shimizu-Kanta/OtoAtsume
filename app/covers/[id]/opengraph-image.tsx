import { getCoverById } from "@/lib/data/covers";
import { createBrandOgImage, OG_SIZE } from "@/lib/og";
import { formatDate } from "@/lib/utils";

export const alt = "おとあつめ カバー記録";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cover = await getCoverById(id);

  if (!cover) {
    return createBrandOgImage({
      label: "COVER",
      title: "カバー記録"
    });
  }

  const performers = cover.performers.map(({ performer }) => performer.name).join(", ");

  return createBrandOgImage({
    label: "COVER",
    title: cover.song.title,
    subtitle: performers || undefined,
    stat: `歌唱日 ${formatDate(cover.performedAt)}`
  });
}
