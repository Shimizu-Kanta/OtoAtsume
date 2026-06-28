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