import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "muted" | "accent" | "outline";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] border px-2 py-0.5 text-xs font-medium",
        variant === "default" && "border-rule bg-transparent text-slate",
        variant === "muted" && "border-rule bg-transparent text-[color:var(--slate-light)]",
        variant === "accent" && "border-[color:var(--signal)] text-ink",
        variant === "outline" && "border-rule bg-transparent text-ink",
        className
      )}
      {...props}
    />
  );
}
