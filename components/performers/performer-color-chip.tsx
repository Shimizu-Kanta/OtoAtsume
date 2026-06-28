import { cn } from "@/lib/utils";

type PerformerColorChipProps = {
  name: string;
  colorCode?: string | null;
  className?: string;
};

export function PerformerColorChip({ name, colorCode, className }: PerformerColorChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-sm border bg-background px-2 py-1 text-xs text-foreground",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2.5 shrink-0 rounded-full border", colorCode ? "" : "bg-muted")}
        style={colorCode ? { backgroundColor: colorCode } : undefined}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}