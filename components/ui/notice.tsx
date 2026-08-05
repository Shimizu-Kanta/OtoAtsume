import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

// info-note（情報提供・非ブロッキング）: paper 背景 + hairline border。
export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-[3px] border border-rule bg-[color:var(--paper)] p-3 text-sm text-slate",
        className
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-[color:var(--slate-light)]" aria-hidden="true" />
      <div className="min-w-0 leading-6">{children}</div>
    </div>
  );
}

// warning-banner（注意喚起・非ブロッキング）: signal カラーの淡い背景 + signal 系 border。
// 重複候補の警告など、登録をブロックしない注意喚起に使う。
export function WarningBanner({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-[3px] border border-[color:var(--signal)] bg-[#FDF4E3] p-3 text-sm text-ink",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[color:var(--signal)]" aria-hidden="true" />
      <div className="min-w-0 leading-6">{children}</div>
    </div>
  );
}

// error-text（バリデーションエラー・ブロッキング）: error 色。warning とは見た目を明確に分ける。
export function ErrorText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-sm font-medium text-[color:var(--error)]", className)}>
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

// error-banner（ブロッキングなエラーの帯）。
export function ErrorBanner({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-[3px] border border-[color:var(--error)] bg-[#FBECEC] p-3 text-sm text-[color:var(--error)]",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 leading-6">{children}</div>
    </div>
  );
}
