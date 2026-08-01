"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type Participant = { id: string; name: string };

// 曲ごとの歌唱者を「参加者リスト」からチップで選ぶ。
// デフォルトは全員選択。選択IDは1つの hidden input（カンマ区切り）で送信し、
// 複数行フォームでも行ごとの対応が崩れないようにする。
export function PerformerSelectorChips({
  name,
  participants,
  defaultSelectedIds
}: {
  name: string;
  participants: Participant[];
  defaultSelectedIds?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedIds ?? participants.map((participant) => participant.id))
  );

  const value = useMemo(
    () => participants.filter((p) => selected.has(p.id)).map((p) => p.id).join(","),
    [participants, selected]
  );

  // 参加者が1人以下なら選択UIは出さない（全員をそのまま紐づける）。
  if (participants.length <= 1) {
    return <input type="hidden" name={name} value={participants.map((p) => p.id).join(",")} />;
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-1.5">
        {participants.map((participant) => {
          const isSelected = selected.has(participant.id);
          return (
            <button
              key={participant.id}
              type="button"
              onClick={() => toggle(participant.id)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                isSelected
                  ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {participant.name}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          className="underline"
          onClick={() => setSelected(new Set(participants.map((p) => p.id)))}
        >
          全員選択
        </button>
        <button type="button" className="underline" onClick={() => setSelected(new Set())}>
          全員解除
        </button>
      </div>
    </div>
  );
}
