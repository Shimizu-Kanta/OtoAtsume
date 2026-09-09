"use client";

import { Children, type ReactNode, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CoverCarouselProps = {
  children: ReactNode;
  className?: string;
  itemLayout?: "responsive" | "single" | "shelf";
};

export function CoverCarousel({ children, className, itemLayout = "responsive" }: CoverCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);

  function scroll(direction: "prev" | "next") {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const distance = Math.max(viewport.clientWidth * 0.9, 280);

    viewport.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth"
    });
  }

  if (items.length === 0) {
    return null;
  }

  // shelf は正方形ジャケットを棚に並べる用途。画面幅に応じて3〜7枚が見える。
  const itemClassName =
    itemLayout === "single"
      ? // single はアニバーサリー枠（その活動者の歌唱記録）で使う。aspect-square 化で
        // w-full だと高さ＝幅になり 1 枚がビューポートをほぼ占めるため、上限幅を掛けて
        // 他の棚（170px 前後）と同程度に揃える。コンテナは左寄せのままでよい。
        "w-full min-w-0 max-w-[220px] shrink-0 snap-start"
      : itemLayout === "shelf"
        ? "w-[38%] shrink-0 snap-start sm:w-[22%] lg:w-[16%] xl:w-[13%]"
        : "w-[85%] shrink-0 snap-start sm:w-[calc((100%_-_1rem)/2)] xl:w-[calc((100%_-_2rem)/3)]";

  // 棚は自由に眺められたほうがよいので、吸着を弱める。
  const snapClassName = itemLayout === "shelf" ? "snap-proximity" : "snap-mandatory";

  return (
    // min-w-0 は必須。グリッド/フレックスの子は既定が min-width:auto で min-content まで
    // 伸びるため、これが無いと中の正方形ジャケットと幅が循環して数千 px に膨張する。
    <div className={cn("min-w-0 space-y-3", className)}>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="size-[34px] bg-panel p-0"
          onClick={() => scroll("prev")}
          aria-label="前の歌唱記録を表示"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="size-[34px] bg-panel p-0"
          onClick={() => scroll("next")}
          aria-label="次の歌唱記録を表示"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div
        ref={viewportRef}
        className="scroll-rail -mx-4 overflow-x-auto scroll-smooth px-4 pb-2 pt-1"
      >
        <div className={cn("flex snap-x gap-4", snapClassName)}>
          {items.map((item, index) => (
            <div
              key={index}
              // min-w-0 はレイアウト種別によらず必須。フレックスの子は既定が
              // min-width:auto で min-content まで伸びるため、中の正方形ジャケット
              // （幅から高さが決まる）と幅が循環して数千 px に膨張することがある。
              className={cn("min-w-0", itemClassName)}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}