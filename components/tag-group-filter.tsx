"use client";

import { useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

type TagOption = { id: string; name: string };
type TagGroupData = { id: string; name: string; tags: TagOption[] };

const UNGROUPED_ID = "__ungrouped__";

export function TagGroupFilter({
  grouped,
  ungrouped,
  selectedTagIds
}: {
  grouped: TagGroupData[];
  ungrouped: TagOption[];
  selectedTagIds: string[];
}) {
  // チェック状態は単一の Set で一元管理する（同じタグが複数グループに現れても状態を共有）。
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectedTagIds));
  const [query, setQuery] = useState("");

  const idToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of grouped) {
      for (const tag of group.tags) {
        map.set(tag.id, tag.name);
      }
    }
    for (const tag of ungrouped) {
      map.set(tag.id, tag.name);
    }
    return map;
  }, [grouped, ungrouped]);

  const normalizedQuery = query.trim().toLowerCase();
  const searching = normalizedQuery.length > 0;

  function matches(tag: TagOption) {
    return tag.name.toLowerCase().includes(normalizedQuery);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const selectedList = Array.from(selected);

  const sections: TagGroupData[] = [
    ...grouped,
    ...(ungrouped.length > 0 ? [{ id: UNGROUPED_ID, name: "その他", tags: ungrouped }] : [])
  ];

  return (
    <div className="space-y-3">
      {/* フォーム送信値は選択中IDを1回ずつだけ hidden input で出力する */}
      {selectedList.map((id) => (
        <input key={id} type="hidden" name="tags" value={id} />
      ))}

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
          }
        }}
        placeholder="タグ名で検索"
        className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      {selectedList.length > 0 ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">選択中</p>
          <div className="flex flex-wrap gap-2">
            {selectedList.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/25"
              >
                {idToName.get(id) ?? "タグ"}
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {sections.map((section) => (
          <TagGroupAccordion
            key={section.id}
            section={section}
            selected={selected}
            onToggle={toggle}
            searching={searching}
            matches={matches}
          />
        ))}
      </div>
    </div>
  );
}

function TagGroupAccordion({
  section,
  selected,
  onToggle,
  searching,
  matches
}: {
  section: TagGroupData;
  selected: Set<string>;
  onToggle: (id: string) => void;
  searching: boolean;
  matches: (tag: TagOption) => boolean;
}) {
  // 選択中タグを含むグループはデフォルトで開いた状態にする。
  const [open, setOpen] = useState(() => section.tags.some((tag) => selected.has(tag.id)));

  const visibleTags = searching ? section.tags.filter(matches) : section.tags;

  // 検索中はヒットしたタグを含むグループだけを開いて表示する。
  if (searching && visibleTags.length === 0) {
    return null;
  }

  const isOpen = searching ? true : open;
  const selectedCount = section.tags.filter((tag) => selected.has(tag.id)).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={searching}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground disabled:cursor-default"
      >
        <span>
          {section.name}
          <span className="ml-1 font-normal text-muted-foreground">（{section.tags.length}個</span>
          {selectedCount > 0 ? (
            <span className="font-normal text-primary">・選択{selectedCount}</span>
          ) : null}
          <span className="font-normal text-muted-foreground">）</span>
        </span>
        {!searching ? (
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-180")}
            aria-hidden="true"
          />
        ) : null}
      </button>

      {isOpen ? (
        <div className="flex flex-wrap gap-2 border-t border-border p-3">
          {visibleTags.map((tag) => {
            const isSelected = selected.has(tag.id);

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggle(tag.id)}
                aria-pressed={isSelected}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  isSelected
                    ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                    : "border-border bg-background/80 text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                )}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
