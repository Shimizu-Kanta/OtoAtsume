// 運営者自身の動作確認アクセスをアクセス数集計・アクセス解析から除外するためのフラグ。
// 日本の家庭・モバイル回線はIPが動的でCGNATも多いため、IPベースの除外ではなく
// ブラウザ単位(localStorage)のフラグ方式を採用している。
// `/?internal=1` でON、`/?internal=0` でOFFにできる（本人のみが使う想定）。
const INTERNAL_FLAG_KEY = "oa_internal_viewer";

export function syncInternalFlag() {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  try {
    if (params.get("internal") === "1") {
      window.localStorage.setItem(INTERNAL_FLAG_KEY, "1");
    } else if (params.get("internal") === "0") {
      window.localStorage.removeItem(INTERNAL_FLAG_KEY);
    }
  } catch {
    // localStorage が使えない環境では除外フラグを扱わない。
  }
}

export function isInternalViewer() {
  if (typeof window === "undefined") {
    return false;
  }

  // localStorageへの書き込み(syncInternalFlag)を待たず、現在のURLも直接見る。
  // これにより `?internal=1` を踏んだ最初の1回のページ表示自体も除外できる。
  const params = new URLSearchParams(window.location.search);
  if (params.get("internal") === "1") {
    return true;
  }

  try {
    return window.localStorage.getItem(INTERNAL_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}
