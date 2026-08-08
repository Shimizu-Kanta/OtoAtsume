import Link from "next/link";

import { cn } from "@/lib/utils";

// /rankings が「供給」(歌唱記録が多い順)、/requests が「需要」(気になる曲に
// 追加された順)という対比になっている。
const TABS = [
  { key: "rankings", href: "/rankings", label: "ランキング" },
  { key: "requests", href: "/requests", label: "気になる曲ランキング" }
] as const;

// /rankings と /requests を行き来できるタブ風ナビゲーション。ヘッダーの項目数を
// 増やさずに /requests への導線を作るため、ページをまたぐリンクとして実装する。
export function RankingTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <div className="flex gap-2 border-b border-rule">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            tab.key === active
              ? "border-[color:var(--aqua-deep)] text-ink"
              : "border-transparent text-slate hover:text-ink"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
