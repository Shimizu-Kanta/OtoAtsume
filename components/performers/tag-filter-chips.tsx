"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

// これを超える個数のときだけ折りたたみトグルを出す（おおよそ2行分の近似）。
const COLLAPSE_THRESHOLD = 8;

type TagOption = { id: string; name: string };

export function TagFilterChips({
  tags,
  selectedTagNames
}: {
  tags: TagOption[];
  selectedTagNames: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = useMemo(() => new Set(selectedTagNames), [selectedTagNames]);

  // 選択中タグを先頭に並べ替える（折りたたみ時でも選択状態が見えるように）。
  const ordered = useMemo(
    () =>
      [...tags].sort(
        (a, b) => Number(selected.has(b.name)) - Number(selected.has(a.name))
      ),
    [tags, selected]
  );

  const showToggle = tags.length >= COLLAPSE_THRESHOLD;
  const collapsed = showToggle && !expanded;

  return (
    <div>
      <div
        className={cn(
          "flex flex-wrap gap-2",
          collapsed && "max-h-[4.5rem] overflow-hidden"
        )}
      >
        {ordered.map((tag) => {
          const isSelected = selected.has(tag.name);

          return (
            <label
              key={tag.id}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                isSelected
                  ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                  : "border-border bg-background/80 text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              )}
            >
              <input
                type="checkbox"
                name="tag"
                value={tag.name}
                defaultChecked={isSelected}
                className="size-4 accent-primary"
              />
              {tag.name}
            </label>
          );
        })}
      </div>

      {showToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {expanded ? (
            <>
              折りたたむ
              <ChevronUp className="size-4" aria-hidden="true" />
            </>
          ) : (
            <>
              すべてのタグを表示（全{tags.length}個）
              <ChevronDown className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
