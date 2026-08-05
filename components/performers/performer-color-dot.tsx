import { clampPerformerColor } from "@/lib/performer-color";
import { cn } from "@/lib/utils";

// 活動者の識別子となる 8〜9px の色ドット（3.1）。色の意味は「活動者」専用。
// 明度が高すぎる色は視認できるようクランプする。
export function PerformerColorDot({
  colorCode,
  className
}: {
  colorCode?: string | null;
  className?: string;
}) {
  const color = clampPerformerColor(colorCode);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-[9px] shrink-0 rounded-full",
        color ? "" : "bg-[color:var(--slate-light)]",
        className
      )}
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}

// ドット + 名前を横並びで表示する。デュエット等は本コンポーネントを人数分並べる
// （1行を1色で染めない = 複数人を1色で表現しない）。
export function PerformerColorLabel({
  name,
  colorCode,
  className
}: {
  name: string;
  colorCode?: string | null;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-sm text-ink", className)}>
      <PerformerColorDot colorCode={colorCode} />
      <span className="truncate">{name}</span>
    </span>
  );
}
