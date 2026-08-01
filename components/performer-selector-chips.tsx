"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Participant = { id: string; name: string };

// 曲ごとの歌唱者を「参加者リスト」からチップで選ぶ。
// デフォルトは全員選択。選択IDは1つの hidden input（カンマ区切り）で送信し、
// 複数行フォームでも行ごとの対応が崩れないようにする。
// participants は共通活動者の選択に連動して増減しうるため、変化時に再同期する
// （新しく追加された参加者は自動選択、外れた参加者は除外。既存の手動解除は維持）。
export function PerformerSelectorChips({
  name,
  participants,
  defaultSelectedIds
}: {
  name: string;
  participants: Participant[];
  defaultSelectedIds?: string[];
}) {
  const participantKey = participants.map((participant) => participant.id).join(",");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedIds ?? participants.map((participant) => participant.id))
  );
  const knownIdsRef = useRef<Set<string>>(new Set(participants.map((participant) => participant.id)));

  useEffect(() => {
    const currentIds = participants.map((participant) => participant.id);
    setSelected((previous) => {
      const next = new Set<string>();
      for (const id of currentIds) {
        if (!knownIdsRef.current.has(id)) {
          // 新しく追加された参加者はデフォルトで選択する。
          next.add(id);
        } else if (previous.has(id)) {
          next.add(id);
        }
        // 既知かつ未選択（手動解除）だった参加者は解除のまま。
      }
      return next;
    });
    knownIdsRef.current = new Set(currentIds);
    // participantKey が参加者IDの集合を代表する（配列の参照 identity には依存しない）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantKey]);

  const value = useMemo(
    () => participants.filter((participant) => selected.has(participant.id)).map((participant) => participant.id).join(","),
    [participants, selected]
  );

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

  // 参加者が1人以下なら選択UIは出さない（全員をそのまま紐づける）。
  if (participants.length <= 1) {
    return <input type="hidden" name={name} value={participants.map((participant) => participant.id).join(",")} />;
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
          onClick={() => setSelected(new Set(participants.map((participant) => participant.id)))}
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
