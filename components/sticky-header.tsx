"use client";

import { useEffect, useRef } from "react";

// サイト共通ヘッダーの外枠。md 未満ではナビの行だけを画面上部に残す。
//
// ナビだけを sticky にすると、親（ヘッダー）の高さの範囲でしか貼り付かず、ヘッダーと
// 一緒に流れていってしまう。そこでヘッダー全体を sticky にし、top を
// 「ナビより上の高さ」ぶん負にして、ナビの行だけが画面上端に残るようにする。
//
// 高さは在庫の掲示（Suspense）やフォントの読み込みで変わるため、実測して CSS 変数で配る。
//   --header-h        … ヘッダー全体の高さ
//   --header-sticky-h … 貼り付いたときに見えている高さ（ナビの行 + 下端の罫線）
// 変数が未設定（ハイドレーション前）の間は top の calc が無効になり、貼り付かない。
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const nav = header?.querySelector<HTMLElement>("[data-site-nav]");
    if (!header || !nav) {
      return;
    }

    const root = document.documentElement;
    const update = () => {
      const headerHeight = header.offsetHeight;
      // ナビの上端からヘッダーの下端まで。ナビは罫線に 1px 食い込むので、罫線も含まれる。
      const stickyHeight = header.getBoundingClientRect().bottom - nav.getBoundingClientRect().top;
      root.style.setProperty("--header-h", `${headerHeight}px`);
      root.style.setProperty("--header-sticky-h", `${Math.round(stickyHeight)}px`);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    observer.observe(nav);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--header-h");
      root.style.removeProperty("--header-sticky-h");
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="z-40 max-md:sticky max-md:top-[calc(var(--header-sticky-h)-var(--header-h))]"
    >
      {children}
    </header>
  );
}
