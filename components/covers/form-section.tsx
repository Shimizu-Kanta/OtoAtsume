import type { ReactNode } from "react";

// 歌唱記録登録フォームの各ステップを囲む共通のセクション枠。
// overflow-hidden は付けない: 内部のオートコンプリート候補(絶対配置)が枠で切れるため。
// 角丸は border-radius のみで表現でき、中身をクリップする必要はない。
export function FormSection({
  icon,
  title,
  description,
  children
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-rule bg-panel p-5 shadow-sm">
      <div className="mb-5 flex gap-3 border-b pb-4">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
