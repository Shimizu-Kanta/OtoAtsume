"use client";

import { useEffect, useState } from "react";

import { SongPicker } from "@/components/song-picker";

// サーバーコンポーネントのフォームに埋め込むための、状態を内包した SongPicker。
// 「楽曲候補をクリックで反映」する既存操作に対応するため、
// otoatsume:apply-song-suggestion イベントで楽曲名・アーティスト名を差し替えられる。
export function StandaloneSongPicker({
  titleName = "songTitle",
  artistName = "artistNames",
  titleId = "songTitle",
  defaultTitle = "",
  defaultArtistNames = ""
}: {
  titleName?: string;
  artistName?: string;
  titleId?: string;
  defaultTitle?: string;
  defaultArtistNames?: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [artistNames, setArtistNames] = useState(defaultArtistNames);

  useEffect(() => {
    function handleApply(event: Event) {
      const customEvent = event as CustomEvent<{ title?: string; artistNames?: string }>;
      if (customEvent.detail?.title != null) {
        setTitle(customEvent.detail.title);
      }
      if (customEvent.detail?.artistNames != null) {
        setArtistNames(customEvent.detail.artistNames);
      }
    }

    window.addEventListener("otoatsume:apply-song-suggestion", handleApply);
    return () => window.removeEventListener("otoatsume:apply-song-suggestion", handleApply);
  }, []);

  return (
    <SongPicker
      titleId={titleId}
      titleName={titleName}
      artistName={artistName}
      title={title}
      artistNames={artistNames}
      onTitleChange={setTitle}
      onArtistNamesChange={setArtistNames}
    />
  );
}
