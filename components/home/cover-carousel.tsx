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
      ? "w-full shrink-0 snap-start"
      : itemLayout === "shelf"
        ? "w-[38%] shrink-0 snap-start sm:w-[22%] lg:w-[16%] xl:w-[13%]"
        : "w-[85%] shrink-0 snap-start sm:w-[calc((100%_-_1rem)/2)] xl:w-[calc((100%_-_2rem)/3)]";

  // 棚は自由に眺められたほうがよいので、吸着を弱める。
  const snapClassName = itemLayout === "shelf" ? "snap-proximity" : "snap-mandatory";

  return (
    <div className={cn("space-y-3", className)}>
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
              className={itemClassName}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}