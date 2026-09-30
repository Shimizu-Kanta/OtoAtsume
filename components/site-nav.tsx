"use client";

import { useEffect, useRef, useState } from "react";
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
  { href: "/playlist", label: "おまかせ" },
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
  // 完全一致を先に探す。/covers/new は /covers の前方一致にも掛かるため、
  // 配列順の find だけだと「棚をみる」が選ばれてしまう。
  const activeHref =
    navItems.find((item) => item.href === pathname)?.href ??
    navItems.find((item) => isActive(pathname, item.href))?.href ??
    (pathname.startsWith("/covers") ? "/covers" : null);

  const scrollerRef = useRef<HTMLElement>(null);
  // 初回の位置合わせは瞬時に、以降(ページ遷移で現在地が変わったとき)はなめらかに動かす。
  const positionedRef = useRef(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  // 左右に続きがあるかを判定して、端のフェードを出し分ける。
  // md 以上では折り返し表示でスクロールしないため、両方 false になり何も出ない。
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      const left = scrollLeft > 1;
      const right = scrollLeft + clientWidth < scrollWidth - 1;
      setEdges((current) =>
        current.left === left && current.right === right ? current : { left, right }
      );
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  // 現在地のタブが見えていなければ、横スクロールだけで中央付近へ寄せる。
  // scrollIntoView はページ全体の縦スクロールまで動かすことがあるので使わない。
  useEffect(() => {
    const scroller = scrollerRef.current;
    const tab = scroller?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !tab || scroller.scrollWidth <= scroller.clientWidth) {
      return;
    }

    const left = tab.offsetLeft - (scroller.clientWidth - tab.offsetWidth) / 2;
    scroller.scrollTo({ left, behavior: positionedRef.current ? "smooth" : "auto" });
    positionedRef.current = true;
  }, [activeHref]);

  // 左右キーで隣のタブへフォーカスを移す(Home / End で両端へ)。
  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    const links = Array.from(scrollerRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index === -1) {
      return;
    }

    const next =
      event.key === "ArrowRight"
        ? links[Math.min(index + 1, links.length - 1)]
        : event.key === "ArrowLeft"
          ? links[Math.max(index - 1, 0)]
          : event.key === "Home"
            ? links[0]
            : event.key === "End"
              ? links[links.length - 1]
              : null;

    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  return (
    // md 未満は折り返さず1列にして横スクロールさせる。コンテナは container-page の
    // 左右余白ぶん画面端まで伸ばし、タブが途中で切れて見えないようにする。
    <div data-site-nav className="relative -mx-4 -mb-px sm:-mx-6 sm:w-[calc(100%+3rem)] md:mx-0 md:w-auto">
      <nav
        ref={scrollerRef}
        aria-label="サイト内の棚"
        onKeyDown={handleKeyDown}
        className="scroll-rail relative flex snap-x snap-proximity scroll-px-4 items-end gap-[3px] overflow-x-auto px-4 sm:scroll-px-6 sm:px-6 md:flex-wrap md:overflow-visible md:px-0"
      >
        {navItems.map((item) => {
          const active = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "nav-tab shrink-0 snap-start whitespace-nowrap border border-b-0 border-rule px-4 pb-3 pt-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:focus-visible:ring-inset",
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

      {/* 続きがあることを示す端のフェード。ヘッダー下端の色(panel-2)に溶かす。 */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-panel-2 to-panel-2/0 transition-opacity md:hidden",
          edges.left ? "opacity-100" : "opacity-0"
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-panel-2 to-panel-2/0 transition-opacity md:hidden",
          edges.right ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
