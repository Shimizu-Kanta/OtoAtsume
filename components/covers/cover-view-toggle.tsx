"use client";

import { cn } from "@/lib/utils";

export type CoverViewMode = "card" | "list";

// 値（card / list）は localStorage と URL クエリに保存済みのため変更しない。
// ラベルだけを什器の呼び方（ジャケット / 在庫台帳）に合わせる。
const viewModes = [
  { value: "card", label: "ジャケット" },
  { value: "list", label: "在庫台帳" }
] as const;

export function CoverViewToggle({
  value,
  totalCount,
  albumCount,
  onValueChange
}: {
  value: CoverViewMode;
  totalCount: number;
  // カード表示はアルバム単位でページングするため、件数もアルバム数と曲数の両方を出す。
  albumCount?: number;
  onValueChange: (value: CoverViewMode) => void;
}) {
  const records = `${totalCount.toLocaleString("ja-JP")} records`;
  const countLabel =
    value === "card" && albumCount !== undefined
      ? `${albumCount.toLocaleString("ja-JP")} albums / ${records}`
      : records;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
      <p className="font-mono text-[11px] tabular-nums text-slate">{countLabel}</p>
      <div
        className="inline-flex overflow-hidden rounded-[2px] border border-rule bg-panel"
        role="group"
        aria-label="表示形式"
      >
        {viewModes.map((mode) => {
          const selected = value === mode.value;

          return (
            <button
              key={mode.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onValueChange(mode.value)}
              className={cn(
                "inline-flex h-8 items-center justify-center px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                selected ? "bg-board text-board-ink" : "text-slate hover:bg-hover hover:text-ink"
              )}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
