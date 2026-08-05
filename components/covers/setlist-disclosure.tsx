"use client";

import { Children, type ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// 「この配信・ライブの他の歌唱記録」を折りたたむトグル。
// デフォルトは先頭 initialCount 件のみ表示し、残りは「すべて表示」で展開する。
// 並び順は呼び出し側（タイムスタンプ順）のまま変更しない。
export function SetlistDisclosure({
  children,
  initialCount = 4
}: {
  children: ReactNode;
  initialCount?: number;
}) {
  const items = Children.toArray(children);
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > initialCount;
  const shown = hasMore && !expanded ? items.slice(0, initialCount) : items;

  return (
    <div className="mt-4 space-y-2">
      <div className="divide-y divide-rule overflow-hidden rounded-[3px] border border-rule bg-panel">
        {shown}
      </div>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-rule bg-panel px-3 py-2 text-sm font-medium text-[color:var(--aqua-deep)] transition-colors hover:bg-[#FAFCFD]"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-4" aria-hidden="true" />
              閉じる
            </>
          ) : (
            <>
              <ChevronDown className="size-4" aria-hidden="true" />
              すべて表示（{items.length}件）
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
