"use client";

import {
  BASKET_KEY,
  addEntries,
  clearEntries,
  moveEntry,
  pruneEntries,
  readBasket,
  removeEntry,
  type AddToBasketResult,
  type BasketEntry
} from "@/lib/basket/storage";

// useSyncExternalStore 用の薄いストア。かごに入れるボタンはカード・詳細ページ・
// パネルと複数箇所にあるので、localStorage を直接読ませず1か所から配る。
//
// getSnapshot は「変化していなければ同じ参照」を返す必要がある（毎回 parse すると
// 無限再描画になる）。書き込みと storage イベントのときだけキャッシュを差し替える。
let cache: BasketEntry[] | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setCache(entries: BasketEntry[]) {
  cache = entries;
  emit();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);

  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

// 別タブでかごを触ったとき用。キーを問わず読み直しても実害はないが、
// 無関係な書き込みで再描画しないようキーを見る。
function handleStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== BASKET_KEY) {
    return;
  }

  cache = readBasket();
  emit();
}

export function getSnapshot(): BasketEntry[] {
  if (cache === null) {
    cache = readBasket();
  }
  return cache;
}

// サーバ描画時は常に空。localStorage を見られない以上ここでしか決められないので、
// 初回描画は「空のかご」で確定させ、マウント後に実際の中身へ差し替える。
const SERVER_SNAPSHOT: BasketEntry[] = [];

export function getServerSnapshot(): BasketEntry[] {
  return SERVER_SNAPSHOT;
}

export function add(ids: string[]): AddToBasketResult {
  const result = addEntries(ids);
  setCache(result.entries);
  return result;
}

export function remove(id: string) {
  setCache(removeEntry(id));
}

export function clear() {
  setCache(clearEntries());
}

export function move(fromIndex: number, toIndex: number) {
  setCache(moveEntry(fromIndex, toIndex));
}

export function prune(validIds: string[]) {
  const { changed, entries } = pruneEntries(validIds);
  if (changed) {
    setCache(entries);
  }
  return changed;
}
