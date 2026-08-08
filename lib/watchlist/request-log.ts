// 「気になる曲」に追加したことを需要ランキング(/requests)用に記録する。
//
// 注意: アクセス数集計の除外フラグ (oa_internal_viewer) はここには適用しない。
// あのフラグの適用範囲はアクセス数計測 (/api/telemetry/access) のみであり、
// 運営者も一利用者として「気になる曲」を使うため、その追加は通常通り集計対象に含める。
export function recordSongRequest(input: {
  songName: string;
  artistName: string | null;
  songId: string | null;
}) {
  if (typeof window === "undefined") {
    return;
  }

  fetch("/api/watchlist/request-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true
  }).catch(() => {
    // 記録の失敗は追加操作の成否に影響させない。
  });
}
