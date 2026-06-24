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
        "inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "muted" && "bg-muted text-muted-foreground",
        variant === "accent" && "bg-accent text-accent-foreground",
        variant === "outline" && "border bg-background",
        className
      )}
      {...props}
    />
  );
}
