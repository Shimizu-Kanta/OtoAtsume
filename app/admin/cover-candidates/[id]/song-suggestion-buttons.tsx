"use client";

type SongSuggestion = { id: string; title: string; artistNames: string[] };

// クリックすると確定フォームの楽曲名・アーティスト名の入力欄を埋める。
// 既存のカバー登録フォームと同じ「候補をクリックして反映」する操作感に合わせている。
export function SongSuggestionButtons({ suggestions }: { suggestions: SongSuggestion[] }) {
  if (suggestions.length === 0) {
    return null;
  }

  function apply(suggestion: SongSuggestion) {
    const titleInput = document.getElementById("songTitle");
    const artistInput = document.getElementById("artistNames");
    if (titleInput instanceof HTMLInputElement) {
      titleInput.value = suggestion.title;
    }
    if (artistInput instanceof HTMLInputElement) {
      artistInput.value = suggestion.artistNames.join(", ");
    }
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
