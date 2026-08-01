"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Input } from "@/components/ui/input";

type ArtistSuggestion = { id: string; name: string };

// クライアント側の短時間キャッシュ（同じクエリの重複リクエストを抑制）
const cache = new Map<string, { suggestions: ArtistSuggestion[]; similar: ArtistSuggestion[] }>();

// アーティスト名の入力欄（サジェスト + 表記ゆれ警告付き）。
// value/onChange で制御し、name 属性でフォーム送信値になる。
export function ArtistPicker({
  name,
  value,
  onChange,
  placeholder = "原曲アーティスト名",
  id
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [suggestions, setSuggestions] = useState<ArtistSuggestion[]>([]);
  const [similar, setSimilar] = useState<ArtistSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length === 0) {
      setSuggestions([]);
      setSimilar([]);
      return;
    }

    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(async () => {
      const cached = cache.get(query);
      if (cached) {
        setSuggestions(cached.suggestions);
        setSimilar(cached.similar);
        return;
      }
      try {
        const response = await fetch(`/api/artists/suggest?similar=1&q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          suggestions: ArtistSuggestion[];
          similar: ArtistSuggestion[];
        };
        cache.set(query, data);
        setSuggestions(data.suggestions);
        setSimilar(data.similar);
      } catch {
        // サジェスト失敗は無視（入力自体は続行できる）
      }
    }, 300);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [value]);

  const exactMatch = suggestions.some((s) => s.name.toLowerCase() === value.trim().toLowerCase());
  const showSimilarWarning = value.trim().length > 0 && !exactMatch && similar.length > 0;

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {open && suggestions.length > 0 ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-background shadow-md">
          {suggestions.map((artist) => (
            <button
              key={artist.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(artist.name);
                setOpen(false);
              }}
            >
              {artist.name}
            </button>
          ))}
        </div>
      ) : null}

      {showSimilarWarning ? (
        <div className="mt-2 rounded-md border border-accent/60 bg-accent/10 p-2 text-xs">
          <div className="flex items-center gap-1 font-medium">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            似た名前のアーティストが既に登録されています
          </div>
          <ul className="mt-1 list-disc pl-5">
            {similar.map((artist) => (
              <li key={artist.id}>
                <button
                  type="button"
                  className="text-primary underline"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(artist.name);
                  }}
                >
                  {artist.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
