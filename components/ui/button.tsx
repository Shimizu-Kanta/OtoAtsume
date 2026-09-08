import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // プライマリはスタンプの赤。0 2px 0 の影で厚みを出し、:active で沈ませる
        // （press-button は globals.css 側で transform + 影の縮小を定義している）。
        default: "press-button bg-stamp text-white shadow-press hover:brightness-110",
        // 検索・実行など「黒板」側の主要操作
        board: "press-button bg-board text-board-ink shadow-press-board hover:brightness-125",
        secondary: "border border-rule bg-panel text-ink hover:bg-hover",
        outline: "border border-rule bg-transparent text-ink hover:bg-hover",
        ghost: "text-slate hover:bg-hover hover:text-ink",
        destructive: "bg-error text-white hover:brightness-110"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-5 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button };
