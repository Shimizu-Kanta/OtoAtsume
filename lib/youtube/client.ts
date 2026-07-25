type YouTubeThumbnail = {
  url?: string;
  width?: number;
  height?: number;
};

type YouTubeVideoListResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      publishedAt?: string;
      channelId?: string;
      title?: string;
      description?: string;
      channelTitle?: string;
      thumbnails?: {
        default?: YouTubeThumbnail;
        medium?: YouTubeThumbnail;
        high?: YouTubeThumbnail;
        standard?: YouTubeThumbnail;
        maxres?: YouTubeThumbnail;
      };
      tags?: string[];
    };
  }>;
  error?: {
    message?: string;
  };
};

export type YouTubeVideoMetadata = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
  tags: string[];
};

export class YouTubeMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YouTubeMetadataError";
  }
}

export async function fetchYouTubeVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;

  if (!apiKey) {
    throw new YouTubeMetadataError("YouTube Data APIキーが設定されていません。");
  }

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.searchParams.set("part", "snippet");
  endpoint.searchParams.set("id", videoId);
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint.toString(), {
    cache: "no-store"
  });

  const data = (await response.json()) as YouTubeVideoListResponse;

  if (!response.ok) {
    throw new YouTubeMetadataError(
      data.error?.message ?? "YouTube動画情報の取得に失敗しました。"
    );
  }

  const item = data.items?.[0];

  if (!item?.snippet) {
    throw new YouTubeMetadataError("YouTube動画が見つかりませんでした。");
  }

  const snippet = item.snippet;

  if (!snippet.title || !snippet.publishedAt || !snippet.channelId || !snippet.channelTitle) {
    throw new YouTubeMetadataError("YouTube動画情報に必要な項目がありません。");
  }

  return {
    videoId,
    title: snippet.title,
    description: snippet.description ?? "",
    publishedAt: snippet.publishedAt,
    channelId: snippet.channelId,
    channelTitle: snippet.channelTitle,
    thumbnailUrl: pickBestThumbnailUrl(snippet.thumbnails),
    tags: snippet.tags ?? []
  };
}

// originalUrlCandidates（Song.originalUrlCandidates Json）に保存する候補1件の型。
export type OriginalUrlCandidate = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl?: string;
};

type YouTubeSearchListResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: {
        medium?: YouTubeThumbnail;
        high?: YouTubeThumbnail;
        default?: YouTubeThumbnail;
      };
    };
  }>;
  error?: { message?: string };
};

export type YouTubeSearchResultItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl?: string;
};

// 注意: search.list は 1 リクエストあたり 100 ユニットを消費し、YouTube Data API の
// 1日あたり 10,000 ユニットとは別枠の「1日100回」の実質上限として扱われる。
// そのため呼び出し回数（＝バッチ件数）は必ず制御すること（lib/original-url-suggestions.ts 参照）。
export async function searchYouTubeVideos(
  query: string,
  maxResults = 3
): Promise<YouTubeSearchResultItem[]> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;

  if (!apiKey) {
    throw new YouTubeMetadataError("YouTube Data APIキーが設定されていません。");
  }

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
  endpoint.searchParams.set("part", "snippet");
  endpoint.searchParams.set("type", "video");
  endpoint.searchParams.set("maxResults", String(maxResults));
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint.toString(), { cache: "no-store" });
  const data = (await response.json()) as YouTubeSearchListResponse;

  if (!response.ok) {
    throw new YouTubeMetadataError(data.error?.message ?? "YouTube検索に失敗しました。");
  }

  return (data.items ?? [])
    .filter((item) => item.id?.videoId && item.snippet?.title && item.snippet.channelTitle)
    .map((item) => ({
      videoId: item.id!.videoId!,
      title: item.snippet!.title!,
      channelTitle: item.snippet!.channelTitle!,
      thumbnailUrl:
        item.snippet!.thumbnails?.high?.url ??
        item.snippet!.thumbnails?.medium?.url ??
        item.snippet!.thumbnails?.default?.url
    }));
}

function pickBestThumbnailUrl(thumbnails: {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
} | undefined) {
  if (!thumbnails) {
    return undefined;
  }

  return (
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url
  );
}