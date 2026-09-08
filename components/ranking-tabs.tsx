import Link from "next/link";

import { cn } from "@/lib/utils";

// /rankings が「供給」(歌唱記録が多い順)、/requests が「需要」(気になる曲に
// 追加された順)という対比になっている。
const TABS = [
  { key: "rankings", href: "/rankings", label: "店内チャート" },
  { key: "requests", href: "/requests", label: "入荷リクエスト" }
] as const;

// /rankings と /requests を行き来できるタブ風ナビゲーション。ヘッダーの項目数を
// 増やさずに /requests への導線を作るため、ページをまたぐリンクとして実装する。
export function RankingTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    // 仕切り板のタブ。ヘッダーのナビと同じ形にして、店内の分類だと分かるようにする。
    <div className="flex gap-[3px] border-b border-rule">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "nav-tab -mb-px whitespace-nowrap border border-b-0 border-rule px-4 pb-3 pt-2.5 text-[13px] font-semibold transition-colors",
            tab.key === active
              ? "bg-board text-board-ink"
              : "bg-paper text-slate hover:bg-panel hover:text-ink"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
