import { coverTypeLabel } from "@/lib/constants";
import type { CoverType } from "@prisma/client";

export type CoverTypeCount = { type: CoverType; count: number };
export type YearlyCount = { year: number; count: number };

// performedAt は日付入力から 00:00 UTC で保存されるため、年の集計・整形は UTC 基準で行う。
export function coverYear(date: Date) {
  return date.getUTCFullYear();
}

export function formatDateJp(date: Date) {
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

// [{歌ってみた動画, 7}, {歌枠, 9}] → "歌ってみた動画が7件、歌枠が9件"
export function formatCoverTypeBreakdown(breakdown: CoverTypeCount[]) {
  return breakdown.map((item) => `${coverTypeLabel(item.type)}が${item.count}件`).join("、");
}

export function summarizeCoverTypeCounts(coverTypes: CoverType[]): CoverTypeCount[] {
  const counts = new Map<CoverType, number>();
  for (const type of coverTypes) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function summarizeYearlyCounts(dates: Date[]): YearlyCount[] {
  const counts = new Map<number, number>();
  for (const date of dates) {
    const year = coverYear(date);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}
