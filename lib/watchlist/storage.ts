const WATCHLIST_KEY = "oa_watchlist";
const LAST_CHECK_KEY = "oa_watchlist_last_check";
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
export const WATCHLIST_MAX = 10;

export type WatchlistItem = {
  id: string;
  songName: string;
  artistName: string | null;
  songId: string | null;
  addedAt: string;
  lastCheckedAt: string | null;
  knownCoverCount: number;
  hasUpdate: boolean;
};

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WatchlistItem[]) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchlistItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
  } catch {
    // localStorage が使えない環境では保存をあきらめる。
  }
}

function newItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export type AddWatchlistInput = {
  songName: string;
  artistName?: string | null;
  songId?: string | null;
  knownCoverCount?: number;
};

// added は「実際に新しい項目が保存されたか」。既に同じ曲が入っていた場合は
// ok: true / added: false になる（需要ログを二重に送らないための判別に使う）。
export type AddWatchlistResult =
  | { ok: true; added: boolean; items: WatchlistItem[] }
  | { ok: false; error: string };

export function addWatchlistItem(input: AddWatchlistInput): AddWatchlistResult {
  const songName = input.songName.trim();
  const artistName = input.artistName?.trim() || null;

  if (!songName) {
    return { ok: false, error: "曲名を入力してください。" };
  }

  const items = getWatchlist();

  // 同じ曲(songId一致、またはsongId未確定同士は曲名+アーティスト名一致)は追加せず、
  // 既存の項目をそのまま返す(見た目上の重複行を防ぐ)。
  const duplicate = items.find((item) => {
    if (input.songId && item.songId) {
      return item.songId === input.songId;
    }
    return (
      item.songName.trim().toLowerCase() === songName.toLowerCase() &&
      (item.artistName?.trim().toLowerCase() || "") === (artistName?.toLowerCase() || "")
    );
  });

  if (duplicate) {
    return { ok: true, added: false, items };
  }

  if (items.length >= WATCHLIST_MAX) {
    return {
      ok: false,
      error: `気になる曲は最大${WATCHLIST_MAX}件までです。不要な曲を削除してから追加してください。`
    };
  }

  const item: WatchlistItem = {
    id: newItemId(),
    songName,
    artistName,
    songId: input.songId ?? null,
    addedAt: new Date().toISOString(),
    lastCheckedAt: null,
    knownCoverCount: input.knownCoverCount ?? 0,
    hasUpdate: false
  };

  const next = [...items, item];
  saveWatchlist(next);
  return { ok: true, added: true, items: next };
}

export function removeWatchlistItem(id: string): WatchlistItem[] {
  const next = getWatchlist().filter((item) => item.id !== id);
  saveWatchlist(next);
  return next;
}

export function markWatchlistRead(): WatchlistItem[] {
  const next = getWatchlist().map((item) => (item.hasUpdate ? { ...item, hasUpdate: false } : item));
  saveWatchlist(next);
  return next;
}

export function countUnread(items: WatchlistItem[]) {
  return items.filter((item) => item.hasUpdate).length;
}

// 動作確認用に、間隔を待たず照合を即実行させるためのクエリパラメータ。
// フラグとしては保存せず「前回照合時刻を消すだけ」にして、次回以降は
// 通常の間隔判定に戻るようにする（常時強制になると負荷が読めなくなるため）。
function consumeForceCheckParam() {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("watchcheck") !== "1") {
    return;
  }

  try {
    window.localStorage.removeItem(LAST_CHECK_KEY);
  } catch {
    // localStorage が使えない環境では強制実行もできないため何もしない。
  }
}

// SPAのページ遷移ごとに無条件実行すると1回の閲覧で何度もAPIを呼ぶことになるため、
// 必ずこの時刻ベースの間隔判定を通す。
// 例外は2つ:
//   - まだ一度も照合されていない項目(lastCheckedAtがnull)がある場合。これがないと、
//     追加直後の項目が次の間隔まで件数0のまま放置されてしまう。
//   - `?watchcheck=1` が付いている場合（動作確認用の強制実行）。
export function shouldRunWatchlistCheck(items: WatchlistItem[]): boolean {
  if (typeof window === "undefined" || items.length === 0) {
    return false;
  }

  // 間隔判定より前に処理する必要がある（後だとそのページでは効かない）。
  consumeForceCheckParam();

  if (items.some((item) => item.lastCheckedAt === null)) {
    return true;
  }

  try {
    const lastCheck = window.localStorage.getItem(LAST_CHECK_KEY);
    if (!lastCheck) {
      return true;
    }

    const elapsed = Date.now() - new Date(lastCheck).getTime();
    return Number.isNaN(elapsed) || elapsed >= CHECK_INTERVAL_MS;
  } catch {
    return false;
  }
}

function markChecked() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
  } catch {
    // localStorage が使えない環境では次回も照合を試みるだけなので無視する。
  }
}

export type WatchlistCheckApiResult = {
  id: string;
  matched: boolean;
  songId: string | null;
  newCoverCount: number;
  totalCoverCount: number;
};

// /api/watchlist/check のレスポンスを各ウォッチ項目に反映する
// (songId確定・件数更新・NEWバッジ用の hasUpdate フラグ)。
export function applyWatchlistCheckResults(results: WatchlistCheckApiResult[]): WatchlistItem[] {
  const items = getWatchlist();
  const resultById = new Map(results.map((result) => [result.id, result]));
  const now = new Date().toISOString();

  const next = items.map((item) => {
    const result = resultById.get(item.id);
    if (!result) {
      return item;
    }

    const newlyMatched = !item.songId && result.matched;
    const hasUpdate = item.hasUpdate || result.newCoverCount > 0 || newlyMatched;

    return {
      ...item,
      songId: result.songId ?? item.songId,
      knownCoverCount: result.matched ? result.totalCoverCount : item.knownCoverCount,
      lastCheckedAt: now,
      hasUpdate
    };
  });

  saveWatchlist(next);
  markChecked();
  return next;
}
