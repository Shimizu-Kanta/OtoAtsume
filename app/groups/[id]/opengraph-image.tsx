import { getGroupById, getGroupCoverCount } from "@/lib/data/groups";
import { createBrandOgImage, OG_SIZE } from "@/lib/og";

export const alt = "おとあつめ グループ情報";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = await getGroupById(id);

  if (!group) {
    return createBrandOgImage({
      label: "GROUP",
      title: "グループ情報"
    });
  }

  const coverCount = await getGroupCoverCount(group.id);

  return createBrandOgImage({
    label: "GROUP",
    title: group.name,
    stat: `歌唱記録 ${coverCount.toLocaleString("ja-JP")} 件`
  });
}
