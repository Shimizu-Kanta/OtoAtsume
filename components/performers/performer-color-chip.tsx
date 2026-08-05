import { clampPerformerColor } from "@/lib/performer-color";
import { cn } from "@/lib/utils";

type PerformerColorChipProps = {
  name: string;
  colorCode?: string | null;
  className?: string;
};

// 活動者チップ: 色は「ドット」だけが担い、枠は neutral な hairline にする
// （1つの視覚要素に1つの意味 = 背景色で活動者を表現しない）。
export function PerformerColorChip({ name, colorCode, className }: PerformerColorChipProps) {
  const color = clampPerformerColor(colorCode);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-[2px] border border-rule bg-panel px-2 py-0.5 text-xs text-ink",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-[9px] shrink-0 rounded-full", color ? "" : "bg-[color:var(--slate-light)]")}
        style={color ? { backgroundColor: color } : undefined}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
