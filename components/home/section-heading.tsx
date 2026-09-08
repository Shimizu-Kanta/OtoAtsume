import type { ReactNode } from "react";

// トップページの棚見出し。見出しは棚の名前（比喩）にするが、説明文は素直な日本語にする。
// 初見の人と検索結果のスニペットで意味が通らなくなるのを防ぐため、description に比喩は使わない。
// en は什器の値札に刷られた英字ラベルの見立てで、見出しの右に添える。
export function SectionHeading({
  en,
  title,
  description,
  action
}: {
  en?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-3.5">
          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-[22px]">{title}</h2>
          {en ? <span className="eyebrow-muted">{en}</span> : null}
        </div>
        <p className="mt-1.5 text-[13px] text-slate">{description}</p>
      </div>
      {action}
    </div>
  );
}
