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
