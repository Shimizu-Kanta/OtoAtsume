import { coverTypeLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

// 歌唱種別のタグ（3.2）。色は使わず、hairline border + 薄いテキストで表す。
// 色ドット（活動者）とは明確に区別する。
export function CoverTypeTag({ type, className }: { type: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border border-rule px-1.5 py-0.5 text-xs text-[color:var(--slate-light)]",
        className
      )}
    >
      {coverTypeLabel(type)}
    </span>
  );
}
