"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/notice";
import { WATCHLIST_CHANGED_EVENT } from "@/components/watchlist/events";
import { addWatchlistItem } from "@/lib/watchlist/storage";
import { cn } from "@/lib/utils";

export function AddToWatchlistButton({
  songName,
  artistName = null,
  songId = null,
  label = "気になる曲に追加",
  className
}: {
  songName: string;
  artistName?: string | null;
  songId?: string | null;
  label?: string;
  className?: string;
}) {
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const result = addWatchlistItem({ songName, artistName, songId });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    setAdded(true);
    window.dispatchEvent(new Event(WATCHLIST_CHANGED_EVENT));
  }

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={added}
        className={cn(buttonVariants({ variant: "outline" }), className)}
      >
        {added ? (
          <BookmarkCheck className="size-4" aria-hidden="true" />
        ) : (
          <Bookmark className="size-4" aria-hidden="true" />
        )}
        {added ? "気になる曲に追加しました" : label}
      </button>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </div>
  );
}
