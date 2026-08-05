"use client";

import { LayoutGrid, List } from "lucide-react";

import { cn } from "@/lib/utils";

export type CoverViewMode = "card" | "list";

const viewModes = [
  { value: "card", label: "カード", icon: LayoutGrid },
  { value: "list", label: "リスト", icon: List }
] as const;

export function CoverViewToggle({
  value,
  totalCount,
  onValueChange
}: {
  value: CoverViewMode;
  totalCount: number;
  onValueChange: (value: CoverViewMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="font-mono text-xs tabular-nums text-slate">{totalCount.toLocaleString("ja-JP")} records</p>
      <div className="inline-flex rounded-[3px] border border-rule bg-panel" role="group" aria-label="表示形式">
        {viewModes.map((mode) => {
          const Icon = mode.icon;
          const selected = value === mode.value;

          return (
            <button
              key={mode.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onValueChange(mode.value)}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring first:rounded-l-[2px] last:rounded-r-[2px]",
                selected ? "bg-ink text-white" : "text-slate hover:bg-[#FAFCFD] hover:text-ink"
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
