import type { ReactNode } from "react";

// トップページの棚見出し。見出しは棚の名前（比喩）にするが、説明文は素直な日本語にする。
// 初見の人と検索結果のスニペットで意味が通らなくなるのを防ぐため、description に比喩は使わない。
export function SectionHeading({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
