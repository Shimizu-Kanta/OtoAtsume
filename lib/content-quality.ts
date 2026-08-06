import { MasterDataStatus } from "@prisma/client";

// ページ品質（掲載可能な情報量）の判定閾値を一箇所に集約する。
// AdSense 再申請の結果を見て調整するため、各ページにマジックナンバーを散らさない。
//
// 現在の閾値「1件」は、データ総量が小さい現状（歌唱記録 約130件）に合わせた設定。
// 歌唱記録が 500 件を超えた段階で song / performer を 2 に引き上げる想定のため、
// ここの数値を書き換えるだけで全ページに反映される設計にしている。
export const CONTENT_QUALITY_THRESHOLDS = {
  song: 1, // 歌唱記録が1件以上
  performer: 1, // 歌唱記録が1件以上（記録ゼロの活動者を除外）
  group: 1, // 所属活動者の歌唱記録合計が1件以上
  tag: 2 // タグに紐づく「記録を持つ活動者」が2人以上
} as const;

export type ContentQualityReason =
  | "sufficient"
  | "too-few-covers"
  | "too-few-performers"
  | "isolated"
  | "pending"
  | "hidden";

export type ContentQualityResult = {
  isIndexable: boolean;
  reason: ContentQualityReason;
};

const SUFFICIENT: ContentQualityResult = { isIndexable: true, reason: "sufficient" };

function statusReason(status: MasterDataStatus): ContentQualityReason | null {
  if (status === MasterDataStatus.PENDING) {
    return "pending";
  }

  if (status === MasterDataStatus.HIDDEN) {
    return "hidden";
  }

  return null;
}

export function evaluateSongQuality(coverCount: number): ContentQualityResult {
  if (coverCount >= CONTENT_QUALITY_THRESHOLDS.song) {
    return SUFFICIENT;
  }

  return { isIndexable: false, reason: "too-few-covers" };
}

export function evaluatePerformerQuality(
  coverCount: number,
  status: MasterDataStatus
): ContentQualityResult {
  const blocked = statusReason(status);
  if (blocked) {
    return { isIndexable: false, reason: blocked };
  }

  if (coverCount >= CONTENT_QUALITY_THRESHOLDS.performer) {
    return SUFFICIENT;
  }

  return { isIndexable: false, reason: "too-few-covers" };
}

export function evaluateGroupQuality(totalCoverCount: number): ContentQualityResult {
  if (totalCoverCount >= CONTENT_QUALITY_THRESHOLDS.group) {
    return SUFFICIENT;
  }

  return { isIndexable: false, reason: "too-few-covers" };
}

// performerCount は「記録を持つ活動者」の人数を渡すこと（記録ゼロの活動者は数えない）。
export function evaluateTagQuality(performerCount: number): ContentQualityResult {
  if (performerCount >= CONTENT_QUALITY_THRESHOLDS.tag) {
    return SUFFICIENT;
  }

  return { isIndexable: false, reason: "too-few-performers" };
}

export type CoverQualityInput = {
  sameSongCount: number; // 同じ楽曲の他の歌唱記録数（自身を除く）
  samePerformerCount: number; // 同じ活動者の他の歌唱記録数（自身を除く）
  sameSourceCount: number; // 同じ sourceUrl の他の歌唱記録数（自身を除く）
};

// 3種の関連セクションがすべて空になる「孤立した」歌唱記録は情報量が乏しいため index 対象外。
// 関連記録が増えれば自動的に index 対象へ復帰する（手動フラグは設けない）。
export function evaluateCoverQuality(input: CoverQualityInput): ContentQualityResult {
  const related = input.sameSongCount + input.samePerformerCount + input.sameSourceCount;

  if (related === 0) {
    return { isIndexable: false, reason: "isolated" };
  }

  return SUFFICIENT;
}
