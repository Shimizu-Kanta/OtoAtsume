import { toTokyoDateKey } from "@/lib/utils";

// 歌唱記録候補から一括登録画面（/admin/covers/bulk-new）へ引き継ぐクエリ。
// coverType を省略した場合は付けない（呼び出し側で選ばれた種別を付与する）。
export function buildCandidateBulkHandoffParams(
  candidate: { videoUrl: string; publishedAt: Date; sourcePerformerId: string | null },
  coverType?: string
) {
  const params = new URLSearchParams();
  params.set("sourceUrl", candidate.videoUrl);
  params.set("performedAt", toTokyoDateKey(candidate.publishedAt));
  if (coverType) {
    params.set("coverType", coverType);
  }
  if (candidate.sourcePerformerId) {
    params.append("performerIds", candidate.sourcePerformerId);
  }
  return params;
}
