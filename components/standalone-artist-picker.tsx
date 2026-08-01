"use client";

import { useState } from "react";

import { ArtistPicker } from "@/components/artist-picker";

// サーバーコンポーネントのフォームに埋め込むための、状態を内包した ArtistPicker。
export function StandaloneArtistPicker({
  name,
  defaultValue = "",
  placeholder
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return <ArtistPicker name={name} value={value} onChange={setValue} placeholder={placeholder} />;
}
