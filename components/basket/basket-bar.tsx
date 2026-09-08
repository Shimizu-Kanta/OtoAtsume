"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ShoppingCart, X } from "lucide-react";

import { BasketPanel } from "@/components/basket/basket-panel";
import { useBasket } from "@/lib/basket/context";

// スマホの下部バーとボトムシート。
//
// position: fixed で常時最前面に置かない。下部固定バーはフッター付近の広告と
// 重なりやすく、AdSense 審査中は特に避けたい。sticky + bottom-0 にして、
// フッターまでスクロールしたら自然に押し上げられるようにする。
export function BasketBar() {
  const basket = useBasket();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // 空のかごのためにバーで画面を狭めない。中身ができてから出す。
  if (basket.count === 0) {
    return null;
  }

  return (
    <>
      <div className="sticky bottom-0 z-30 border-t border-rule bg-panel lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="container-page flex h-12 w-full items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-ink">
            <ShoppingCart className="size-4" aria-hidden="true" />
            CDかご
            <span className="font-mono tabular-nums text-slate">{basket.count}曲</span>
          </span>
          <ChevronUp className="size-4 text-slate" aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-[#16212b]/[0.55] lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="CDかご"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-[3px] border-t border-rule bg-panel shadow-modal"
          >
            <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
              <p className="text-sm font-bold text-ink">CDかご</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="rounded-[2px] p-1 text-slate transition-colors hover:bg-hover hover:text-ink"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="px-4 pb-5 pt-3">
              <BasketPanel onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
