import { coverTypeLabel } from "@/lib/constants";
import { formatDateInput } from "@/lib/utils";

// 帯は縦組みで表示するため、日付のハイフンで折り返しが起きると
// 「2026-08-」「22」のように割れてしまう。ハイフンを non-breaking hyphen
// (U+2011) に置き換えて、日付が1つの塊として縦に流れるようにする。
// この置換は帯の表示に必須。
const NON_BREAKING_HYPHEN = "‑";

export function toObiDate(value: Date | string) {
  return formatDateInput(value).split("-").join(NON_BREAKING_HYPHEN);
}

// 帯の文字列: `{曲数}曲/{歌唱種別} {歌唱日}`（例: 9曲/歌枠 2026‑08‑22）
// compact（104px 以下の枠）では帯自体が細くなるので曲数だけにする。
export function buildObiText({
  trackCount,
  coverType,
  performedAt,
  compact = false
}: {
  trackCount: number;
  coverType: string;
  performedAt: Date | string;
  compact?: boolean;
}) {
  const tracks = `${Math.max(1, trackCount)}曲`;

  if (compact) {
    return tracks;
  }

  return `${tracks}/${coverTypeLabel(coverType)} ${toObiDate(performedAt)}`;
}

// 曲数が分からない文脈（CoverListItem しか手元に無い一覧）向けの帯。
// 「1曲」と刷ってしまうと複数曲入りの配信で嘘になるので、曲数は省く。
export function buildTracklessObiText({
  coverType,
  performedAt
}: {
  coverType: string;
  performedAt: Date | string;
}) {
  return `${coverTypeLabel(coverType)} ${toObiDate(performedAt)}`;
}
