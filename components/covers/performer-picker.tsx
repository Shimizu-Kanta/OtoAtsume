"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type PerformerOption = {
  id: string;
  name: string;
  group: {
    name: string;
  } | null;
};

export function PerformerPicker({
  performers,
  defaultSelectedIds = []
}: {
  performers: PerformerOption[];
  defaultSelectedIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set(defaultSelectedIds));

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return performers;
    }

    return performers.filter((performer) => {
      const groupName = performer.group?.name ?? "";
      return `${performer.name} ${groupName}`.toLowerCase().includes(normalized);
    });
  }, [performers, query]);

  const selectedPerformers = useMemo(
    () => performers.filter((performer) => selectedIds.has(performer.id)),
    [performers, selectedIds]
  );

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  useEffect(() => {
    function handleAddPerformer(event: Event) {
      const customEvent = event as CustomEvent<{ id?: string }>;
      const id = customEvent.detail?.id;

      if (!id) {
        return;
      }

      setSelectedIds((current) => {
        const next = new Set(current);
        next.add(id);
        return next;
      });
    }

    window.addEventListener("otoatsume:add-performer-id", handleAddPerformer);

    return () => {
      window.removeEventListener("otoatsume:add-performer-id", handleAddPerformer);
    };
  }, []);

  return (
    <div className="space-y-3">
      {[...selectedIds].map((id) => (
        <input key={id} type="hidden" name="performerIds" value={id} />
      ))}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
          placeholder="活動者名・グループ名で検索"
          type="search"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border bg-background">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">一致する活動者がありません。</p>
        ) : (
          <div className="divide-y">
            {filtered.map((performer) => (
              <label
                key={performer.id}
                className="flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-muted/60"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(performer.id)}
                  onChange={() => toggle(performer.id)}
                  className="mt-1 size-4"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{performer.name}</span>
                  {performer.group ? (
                    <span className="block text-muted-foreground">{performer.group.name}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">選択中の活動者</p>

        {selectedPerformers.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedPerformers.map((performer) => (
              <button
                key={performer.id}
                type="button"
                className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm hover:bg-muted"
                onClick={() => toggle(performer.id)}
                aria-label={`${performer.name}の選択を解除`}
              >
                <span className="font-medium">{performer.name}</span>
                {performer.group ? (
                  <span className="text-xs text-muted-foreground">{performer.group.name}</span>
                ) : null}
                <span aria-hidden="true" className="text-muted-foreground">
                  ×
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            活動者はまだ選択されていません。
          </p>
        )}
      </div>

    </div>
  );
}
