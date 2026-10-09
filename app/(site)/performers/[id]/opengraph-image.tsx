import { getPerformerById } from "@/lib/data/performers";
import { createBrandOgImage, OG_SIZE } from "@/lib/og";

export const alt = "おとあつめ 活動者情報";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const performer = await getPerformerById(id);

  if (!performer) {
    return createBrandOgImage({
      label: "PERFORMER",
      title: "活動者情報"
    });
  }

  return createBrandOgImage({
    label: "PERFORMER",
    title: performer.name,
    subtitle: performer.group?.name ?? undefined,
    stat: `歌唱記録 ${performer.covers.length.toLocaleString("ja-JP")} 件`
  });
}
