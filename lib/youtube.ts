const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

function normalizeVideoId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const videoId = value.trim();
  return YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

function isYouTubeHost(hostname: string) {
  return hostname === "youtube.com" || hostname === "m.youtube.com";
}

export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  const rawUrl = url?.trim();

  if (!rawUrl) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);

  if (hostname === "youtu.be") {
    return normalizeVideoId(pathSegments[0]);
  }

  if (!isYouTubeHost(hostname)) {
    return null;
  }

  if (parsedUrl.pathname === "/watch") {
    return normalizeVideoId(parsedUrl.searchParams.get("v"));
  }

  if (["shorts", "live", "embed"].includes(pathSegments[0])) {
    return normalizeVideoId(pathSegments[1]);
  }

  return null;
}

export function getYouTubeThumbnailUrl(url: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

// Cover 保存用に YouTube URL を正規化する。
// t（タイムスタンプ）・si（共有トラッキング）・list（再生リスト）等の付随パラメータを落とし、
// videoId のみのクリーンな watch URL にする。YouTube 以外の URL は trim のみ。
// タイムスタンプは timestampSeconds フィールドで保持するため sourceUrl に埋め込まない。
export function normalizeYouTubeSourceUrl(rawUrl: string): string {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) {
    return rawUrl.trim();
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}

const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{20,}$/;

export type YouTubeChannelRef =
  | { kind: "handle"; handle: string }
  | { kind: "channelId"; channelId: string };

// 活動者の youtubeUrl からチャンネルの参照（ハンドル or チャンネルID）を取り出す。
// - https://www.youtube.com/@zuzu_channel   → { kind: "handle", handle: "@zuzu_channel" }
// - https://www.youtube.com/channel/UCxxxx  → { kind: "channelId", channelId: "UCxxxx" }
// - https://www.youtube.com/@handle/videos などの末尾セグメント付きにも対応
export function extractYouTubeChannelRef(url: string | null | undefined): YouTubeChannelRef | null {
  const rawUrl = url?.trim();
  if (!rawUrl) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname !== "youtube.com" && hostname !== "m.youtube.com") {
    return null;
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);

  // /@handle または /@handle/videos
  const handleSegment = segments.find((segment) => segment.startsWith("@"));
  if (handleSegment) {
    return { kind: "handle", handle: handleSegment };
  }

  // /channel/UCxxxx
  const channelIndex = segments.indexOf("channel");
  if (channelIndex >= 0 && segments[channelIndex + 1]) {
    const channelId = segments[channelIndex + 1];
    if (CHANNEL_ID_PATTERN.test(channelId)) {
      return { kind: "channelId", channelId };
    }
  }

  return null;
}
