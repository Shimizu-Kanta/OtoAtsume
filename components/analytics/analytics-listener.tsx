"use client";

import { useEffect } from "react";

import { track, trackingContext } from "@/lib/analytics";

const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be"
]);

// サーバーコンポーネントに置かれた素の <a> / <form> にはハンドラを足せないため、
// YouTube への外部リンクとサイト内検索は document で一括して拾う。
// 計測のためにクリックや送信を止めたり遅らせたりはしない。
export function AnalyticsListener() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      // 左クリックと中クリック（新しいタブで開く）だけを数える。
      if (event.button !== 0 && event.button !== 1) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }

      if (!YOUTUBE_HOSTNAMES.has(url.hostname)) {
        return;
      }

      const context = trackingContext(anchor);

      // かご・おまかせプレイリストの「まとめて YouTube で開く」。
      if (url.pathname === "/watch_videos") {
        const ids = url.searchParams.get("video_ids") ?? "";
        track("playlist_open", {
          item_count: ids.split(",").filter(Boolean).length,
          ui_location: context.ui_location
        });
        return;
      }

      track("youtube_outbound", context);
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.dataset.searchType) {
        return;
      }

      // 並び順や絞り込みだけの送信は検索として数えない。
      const term = Array.from(form.elements)
        .filter(
          (element): element is HTMLInputElement =>
            element instanceof HTMLInputElement && (element.type === "text" || element.type === "search")
        )
        .map((input) => input.value.trim())
        .filter(Boolean)
        .join(" ");

      if (!term) {
        return;
      }

      track("search", { search_term: term, search_type: form.dataset.searchType });
    }

    // capture で拾い、子要素側で stopPropagation されても取りこぼさないようにする。
    document.addEventListener("click", handleClick, true);
    document.addEventListener("auxclick", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("auxclick", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}
