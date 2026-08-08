const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export type ParsedYouTubeUrl = {
  videoId: string;
  canonicalUrl: string;
  timestampSeconds?: number;
};

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = normalizeHostname(url.hostname);

  if (!isYouTubeHostname(hostname)) {
    return null;
  }

  const videoId = extractVideoId(url, hostname);

  if (!videoId || !youtubeVideoIdPattern.test(videoId)) {
    return null;
  }

  const timestampSeconds =
    parseYouTubeTimestamp(url.searchParams.get("t")) ??
    parseYouTubeTimestamp(url.searchParams.get("start")) ??
    parseTimestampFromHash(url.hash);

  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    ...(timestampSeconds === undefined ? {} : { timestampSeconds })
  };
}

export function isYouTubeUrl(input: string) {
  return parseYouTubeUrl(input) !== null;
}

// 個人用プレイリスト。ログインユーザー本人にしか見えず playlistItems.list では取得できない。
const PERSONAL_PLAYLIST_IDS = new Set(["WL", "LL"]);

// 実在するプレイリストIDの形式（PL/UU/OL/FL/RD... など）をゆるく検証する。
const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;

export type ParsedYouTubePlaylist =
  | { ok: true; playlistId: string }
  | { ok: false; reason: "invalidUrl" | "noPlaylistId" | "personalPlaylist" };

// YouTube URL の list クエリからプレイリストIDを取り出す。
// - https://www.youtube.com/playlist?list=PLxxxx
// - https://www.youtube.com/watch?v=xxxx&list=PLxxxx
// 注意: decodeURIComponent は使わない。`%` 単体のような不正なパーセント文字列で
// 例外を投げるため（URL / URLSearchParams はいずれも投げずに処理する）。
export function extractYouTubePlaylistId(input: string): ParsedYouTubePlaylist {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, reason: "invalidUrl" };
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: "invalidUrl" };
  }

  if (!isYouTubeHostname(normalizeHostname(url.hostname))) {
    return { ok: false, reason: "invalidUrl" };
  }

  const listParam = url.searchParams.get("list")?.trim();

  if (!listParam) {
    return { ok: false, reason: "noPlaylistId" };
  }

  if (PERSONAL_PLAYLIST_IDS.has(listParam.toUpperCase())) {
    return { ok: false, reason: "personalPlaylist" };
  }

  if (!PLAYLIST_ID_PATTERN.test(listParam)) {
    return { ok: false, reason: "noPlaylistId" };
  }

  return { ok: true, playlistId: listParam };
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isYouTubeHostname(hostname: string) {
  return (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "music.youtube.com" ||
    hostname === "youtu.be"
  );
}

function extractVideoId(url: URL, hostname: string) {
  if (hostname === "youtu.be") {
    return firstPathSegment(url);
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }

  const segments = pathSegments(url);

  if (segments[0] === "live" || segments[0] === "shorts" || segments[0] === "embed") {
    return segments[1] ?? null;
  }

  return null;
}

function firstPathSegment(url: URL) {
  return pathSegments(url)[0] ?? null;
}

function pathSegments(url: URL) {
  return url.pathname.split("/").filter(Boolean);
}

function parseTimestampFromHash(hash: string) {
  if (!hash) {
    return undefined;
  }

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return parseYouTubeTimestamp(params.get("t")) ?? parseYouTubeTimestamp(params.get("start"));
}

export function parseYouTubeTimestamp(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  const match = normalized.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);

  if (!match) {
    return undefined;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 60 * 60 + minutes * 60 + seconds;

  return total > 0 ? total : undefined;
}