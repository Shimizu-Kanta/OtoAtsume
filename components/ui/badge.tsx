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
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        variant === "default" && "bg-primary/15 text-primary ring-primary/20",
        variant === "muted" && "bg-muted text-muted-foreground ring-border/60",
        variant === "accent" && "bg-accent/20 text-accent-foreground ring-accent/30",
        variant === "outline" && "border bg-background text-foreground ring-border",
        className
      )}
      {...props}
    />
  );
}
