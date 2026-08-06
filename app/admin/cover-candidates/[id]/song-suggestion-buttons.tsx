"use client";

type SongSuggestion = { id: string; title: string; artistNames: string[] };

// クリックすると確定フォームの楽曲名・アーティスト名の入力欄を埋める。
// 既存の歌唱記録登録フォームと同じ「候補をクリックして反映」する操作感に合わせている。
export function SongSuggestionButtons({ suggestions }: { suggestions: SongSuggestion[] }) {
  if (suggestions.length === 0) {
    return null;
  }

  function apply(suggestion: SongSuggestion) {
    // 楽曲名入力は SongPicker（制御コンポーネント）なので、イベント経由で反映する。
    window.dispatchEvent(
      new CustomEvent("otoatsume:apply-song-suggestion", {
        detail: { title: suggestion.title, artistNames: suggestion.artistNames.join(", ") }
      })
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => apply(suggestion)}
          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm text-primary hover:bg-primary/10"
        >
          {suggestion.title}
          {suggestion.artistNames.length > 0 ? `（${suggestion.artistNames.join(", ")}）` : ""}
        </button>
      ))}
    </div>
  );
}
