"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode
} from "react";

import * as store from "@/lib/basket/store";
import type { BasketEntry } from "@/lib/basket/storage";
import type { BasketItem } from "@/lib/basket/types";

type BasketContextValue = {
  // localStorage の中身（ID と順序）。マウント前は空。
  entries: BasketEntry[];
  // /api/basket で解決した表示用の情報。entries と同じ順序。
  items: BasketItem[];
  ids: Set<string>;
  count: number;
  loading: boolean;
  error: string | null;
  add: (ids: string[]) => { ok: boolean; added: number; error?: string };
  // 上限超過などの通知。カードのアイコンボタンには文言を置く場所が無いため、
  // 追加操作の失敗は必ずここを通してトーストで見せる。
  notice: string | null;
  remove: (id: string) => void;
  clear: () => void;
  move: (fromIndex: number, toIndex: number) => void;
};

const BasketContext = createContext<BasketContextValue | null>(null);

export function BasketProvider({ children }: { children: ReactNode }) {
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [items, setItems] = useState<BasketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // entries の並びと ID 列だけを依存にする。参照が変わっただけの再取得を避ける。
  const idKey = entries.map((entry) => entry.id).join(",");

  useEffect(() => {
    const ids = idKey ? idKey.split(",") : [];

    if (ids.length === 0) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const response = await fetch("/api/basket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
          signal: controller.signal
        });

        if (!response.ok) {
          setError("かごの中身を読み込めませんでした。");
          setLoading(false);
          return;
        }

        const data = (await response.json()) as { items: BasketItem[] };
        const byId = new Map(data.items.map((item) => [item.id, item]));

        // 削除・非公開になった記録は返ってこない。かごからも取り除く。
        // prune が実際に変更したときは store 側から再描画が走り、この effect が
        // 短い ID 列で回り直す。
        store.prune(data.items.map((item) => item.id));

        setItems(ids.flatMap((id) => byId.get(id) ?? []));
        setError(null);
        setLoading(false);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        setError("かごの中身を読み込めませんでした。");
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [idKey]);

  const add = useCallback((ids: string[]) => {
    const result = store.add(ids);

    if (!result.ok) {
      setNotice(result.error);
      return { ok: false, added: 0, error: result.error };
    }

    return { ok: true, added: result.added };
  }, []);

  // トーストは数秒で自動的に消す。
  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const value = useMemo<BasketContextValue>(
    () => ({
      entries,
      items,
      ids: new Set(entries.map((entry) => entry.id)),
      count: entries.length,
      loading,
      error,
      add,
      notice,
      remove: store.remove,
      clear: store.clear,
      move: store.move
    }),
    [entries, items, loading, error, notice, add]
  );

  return (
    <BasketContext.Provider value={value}>
      {children}
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-20 z-[110] mx-auto max-w-sm rounded-[2px] border border-[color:var(--error)] bg-panel px-4 py-3 text-sm text-[color:var(--error)] shadow-modal sm:bottom-24"
        >
          {notice}
        </div>
      ) : null}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const context = useContext(BasketContext);

  if (!context) {
    throw new Error("useBasket は BasketProvider の中でのみ使えます。");
  }

  return context;
}
