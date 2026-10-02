"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode
} from "react";

import { useBasket } from "@/lib/basket/context";
import type { BasketItem } from "@/lib/basket/types";

// 試聴機に掛かっている一枚。ページを跨いで再生を続けるため、レイアウト直下
// （BasketProvider の内側）に置く。同時に掛けられるのは1枚だけ。
type PreviewContextValue = {
  nowPlayingId: string | null;
  // かごから外れた（削除・非公開を含む）曲は null になる。
  nowPlaying: BasketItem | null;
  play: (id: string) => void;
  stop: () => void;
};

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const basket = useBasket();
  const [nowPlayingId, setNowPlayingId] = useState<string | null>(null);

  const nowPlaying = useMemo(
    () => basket.items.find((item) => item.id === nowPlayingId) ?? null,
    [basket.items, nowPlayingId]
  );

  const play = useCallback((id: string) => setNowPlayingId(id), []);
  const stop = useCallback(() => setNowPlayingId(null), []);

  const value = useMemo(
    () => ({ nowPlayingId, nowPlaying, play, stop }),
    [nowPlayingId, nowPlaying, play, stop]
  );

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreview() {
  const context = useContext(PreviewContext);

  if (!context) {
    throw new Error("usePreview must be used within PreviewProvider");
  }

  return context;
}

// 試聴機をどこに出すかの切り替え。lg 以上は右レールの中、lg 未満は画面下のミニプレイヤー。
// CSS の hidden で出し分けると両方の iframe が生きて二重に鳴るため、JS で片方だけ描画する。
const RAIL_QUERY = "(min-width: 1024px)";

function subscribeRail(callback: () => void) {
  const query = window.matchMedia(RAIL_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useIsRailLayout() {
  return useSyncExternalStore(
    subscribeRail,
    () => window.matchMedia(RAIL_QUERY).matches,
    // サーバーでは判定できない。何も再生していない状態で描画されるだけなので false でよい。
    () => false
  );
}
