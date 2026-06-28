"use client";

import { Children, type ReactNode, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CoverCarouselProps = {
  children: ReactNode;
  className?: string;
};

export function CoverCarousel({ children, className }: CoverCarouselProps) {
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

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => scroll("prev")}
          aria-label="前のカバーを表示"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => scroll("next")}
          aria-label="次のカバーを表示"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div
        ref={viewportRef}
        className="-mx-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex snap-x snap-mandatory gap-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="w-[85%] shrink-0 snap-start sm:w-[calc((100%_-_1rem)/2)] xl:w-[calc((100%_-_2rem)/3)]"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}