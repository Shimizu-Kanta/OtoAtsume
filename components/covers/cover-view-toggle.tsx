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
      <p className="text-sm text-muted-foreground">{totalCount}件</p>
      <div className="inline-flex rounded-md border bg-background p-1" role="group" aria-label="表示形式">
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
                "inline-flex h-9 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
