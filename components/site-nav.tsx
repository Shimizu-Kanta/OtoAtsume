"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// ヘッダーのナビゲーション。レコード棚の仕切り板に見立てて、右上だけ大きく丸めた
// タブ形状にし、ヘッダー下端の罫線に食い込ませる（margin-bottom -1px）。
// 現在地の判定に pathname が要るため、ここだけクライアントコンポーネントにする。
const navItems = [
  { href: "/covers", label: "棚をみる" },
  { href: "/performers", label: "活動者" },
  { href: "/groups", label: "グループ" },
  { href: "/songs", label: "楽曲" },
  { href: "/rankings", label: "チャート" },
  { href: "/covers/new", label: "持ち込み" }
];

function isActive(pathname: string, href: string) {
  // /covers/new は /covers の配下だが別のタブなので、完全一致を先に判定する。
  if (pathname === href) {
    return true;
  }

  if (href === "/covers/new") {
    return false;
  }

  return pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname() ?? "";
  // /covers 配下の詳細ページは「棚をみる」を現在地にしたいが、/covers/new だけは除く。
  const activeHref =
    navItems.find((item) => isActive(pathname, item.href))?.href ??
    (pathname.startsWith("/covers") ? "/covers" : null);

  return (
    <nav className="-mb-px flex flex-wrap items-end gap-[3px]">
      {navItems.map((item) => {
        const active = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "nav-tab whitespace-nowrap border border-b-0 border-rule px-4 pb-3 pt-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-board text-board-ink"
                : "bg-panel-2 text-slate hover:bg-panel hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
