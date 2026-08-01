"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { ArtistPicker } from "@/components/artist-picker";
import { Input } from "@/components/ui/input";

type SongSuggestion = { id: string; title: string; artistNames: string[] };

const cache = new Map<string, { suggestions: SongSuggestion[]; similar: SongSuggestion[] }>();

// 楽曲名の入力欄（サジェスト + 表記ゆれ警告付き）。既存曲を選ぶとアーティスト名も埋まる。
// title/artistNames は親が状態を持ち、name 属性でフォーム送信値になる。
export function SongPicker({
  titleName,
  artistName,
  title,
  artistNames,
  onTitleChange,
  onArtistNamesChange,
  titleId,
  showArtist = true
}: {
  titleName: string;
  artistName: string;
  title: string;
  artistNames: string;
  onTitleChange: (value: string) => void;
  onArtistNamesChange: (value: string) => void;
  titleId?: string;
  showArtist?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
  const [similar, setSimilar] = useState<SongSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = title.trim();
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
        const response = await fetch(`/api/songs/suggest?similar=1&q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          suggestions: SongSuggestion[];
          similar: SongSuggestion[];
        };
        cache.set(query, data);
        setSuggestions(data.suggestions);
        setSimilar(data.similar);
      } catch {
        // サジェスト失敗は無視
      }
    }, 300);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [title]);

  function selectSong(song: SongSuggestion) {
    onTitleChange(song.title);
    onArtistNamesChange(song.artistNames.join(", "));
    setOpen(false);
  }

  const exactMatch = suggestions.some((s) => s.title.toLowerCase() === title.trim().toLowerCase());
  const showSimilarWarning = title.trim().length > 0 && !exactMatch && similar.length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={titleId}
          name={titleName}
          value={title}
          autoComplete="off"
          placeholder="楽曲名"
          onChange={(event) => {
            onTitleChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />

        {open && (suggestions.length > 0 || (title.trim().length > 0 && !exactMatch)) ? (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-background shadow-md">
            {suggestions.map((song) => (
              <button
                key={song.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSong(song);
                }}
              >
                <span className="font-medium">{song.title}</span>
                <span className="text-muted-foreground">
                  {" / "}
                  {song.artistNames.length > 0 ? song.artistNames.join(", ") : "アーティスト未設定"}
                </span>
              </button>
            ))}
            {title.trim().length > 0 && !exactMatch ? (
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                「{title.trim()}」を新しい楽曲として登録します（下にアーティスト名を入力してください）
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showSimilarWarning ? (
        <div className="rounded-md border border-accent/60 bg-accent/10 p-2 text-xs">
          <div className="flex items-center gap-1 font-medium">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            似た名前の楽曲が既に登録されています
          </div>
          <ul className="mt-1 list-disc pl-5">
            {similar.map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  className="text-primary underline"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectSong(song);
                  }}
                >
                  {song.title} / {song.artistNames.join(", ") || "アーティスト未設定"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showArtist ? (
        <ArtistPicker name={artistName} value={artistNames} onChange={onArtistNamesChange} />
      ) : (
        <input type="hidden" name={artistName} value={artistNames} />
      )}
    </div>
  );
}
