import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-[3px] border border-rule bg-panel px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-[color:var(--slate-light)] focus-visible:border-aqua focus-visible:ring-1 focus-visible:ring-aqua disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
