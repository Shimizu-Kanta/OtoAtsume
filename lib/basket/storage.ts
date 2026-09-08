// CDかごのローカルストレージ。lib/watchlist/storage.ts と同じ形にしてある
// （後から読む人が2つの収集機能を同じ読み方で追えるように）。
//
// 保存するのは coverId と追加時刻だけ。曲名などを持たせると、記録が編集・削除された
// ときに古い情報がかごに残り続けるため、表示に必要な情報は毎回 /api/basket で解決する。
// 配列の順序がそのまま再生順・持ち帰り順になる。
export const BASKET_KEY = "oa_basket";

export const BASKET_MAX = 100;

export type BasketEntry = {
  id: string;
  addedAt: number;
};

function parse(raw: string | null): BasketEntry[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // 壊れた値が混ざっていても全体を捨てず、読める項目だけを残す。
    return parsed.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return [];
      }
      const { id, addedAt } = entry as Partial<BasketEntry>;
      if (typeof id !== "string" || !id) {
        return [];
      }
      return [{ id, addedAt: typeof addedAt === "number" ? addedAt : Date.now() }];
    });
  } catch {
    return [];
  }
}

export function readBasket(): BasketEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return parse(window.localStorage.getItem(BASKET_KEY));
  } catch {
    return [];
  }
}

function writeBasket(entries: BasketEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(BASKET_KEY, JSON.stringify(entries));
  } catch {
    // localStorage が使えない環境では保存をあきらめる（その場の操作は効く）。
  }
}

export type AddToBasketResult =
  | { ok: true; added: number; entries: BasketEntry[] }
  | { ok: false; error: string; entries: BasketEntry[] };

// 複数 ID をまとめて追加する。アルバムを1枚かごに入れると収録曲すべてが入るため、
// 単曲追加もこの関数で扱う。既に入っている ID は無視する。
export function addEntries(ids: string[]): AddToBasketResult {
  const current = readBasket();
  const known = new Set(current.map((entry) => entry.id));
  const incoming = Array.from(new Set(ids.filter((id) => id && !known.has(id))));

  if (incoming.length === 0) {
    return { ok: true, added: 0, entries: current };
  }

  if (current.length + incoming.length > BASKET_MAX) {
    const room = Math.max(0, BASKET_MAX - current.length);
    return {
      ok: false,
      error:
        room === 0
          ? `かごは最大${BASKET_MAX}曲までです。何曲か出してから入れてください。`
          : `かごは最大${BASKET_MAX}曲までです。あと${room}曲しか入りません。`,
      entries: current
    };
  }

  const now = Date.now();
  const next = [...current, ...incoming.map((id) => ({ id, addedAt: now }))];
  writeBasket(next);
  return { ok: true, added: incoming.length, entries: next };
}

export function removeEntry(id: string): BasketEntry[] {
  const next = readBasket().filter((entry) => entry.id !== id);
  writeBasket(next);
  return next;
}

export function clearEntries(): BasketEntry[] {
  writeBasket([]);
  return [];
}

// ドラッグでの並べ替え。順序がそのまま再生順・持ち帰り順になるので永続化する。
export function moveEntry(fromIndex: number, toIndex: number): BasketEntry[] {
  const current = readBasket();

  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= current.length ||
    toIndex >= current.length
  ) {
    return current;
  }

  const next = [...current];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  writeBasket(next);
  return next;
}

// API から返ってこなかった ID（削除・非公開になった記録）をかごから取り除く。
// 返り値は「実際に取り除いたか」。呼び出し側で無駄な再描画を避けるために使う。
export function pruneEntries(validIds: string[]): { changed: boolean; entries: BasketEntry[] } {
  const current = readBasket();
  const valid = new Set(validIds);
  const next = current.filter((entry) => valid.has(entry.id));

  if (next.length === current.length) {
    return { changed: false, entries: current };
  }

  writeBasket(next);
  return { changed: true, entries: next };
}
