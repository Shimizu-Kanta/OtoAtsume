import type { ReactNode } from "react";

// 持ち込み伝票（intake slip）の1区画。
// 見出し行の左に連番のスタンプを押し、下に細い罫線を引く＝伝票の記入欄の見立て。
// overflow-hidden は付けない: 内部のオートコンプリート候補(絶対配置)が枠で切れるため。
export function FormSection({
  step,
  title,
  description,
  children
}: {
  // 伝票の連番（01 / 02 / 03…）。
  step: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-1.5">
        <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-[2px] bg-stamp font-mono text-[11px] font-semibold text-white">
          {step}
        </span>
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        <p className="ml-auto text-xs text-[color:var(--slate-light)]">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
