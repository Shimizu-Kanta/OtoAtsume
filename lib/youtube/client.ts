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

type YouTubeChannelsResponse = {
  items?: Array<{
    id?: string;
    snippet?: { title?: string };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
  error?: { message?: string };
};

export type ResolvedChannel = {
  channelId: string;
  uploadsPlaylistId: string;
  channelTitle: string;
};

// ハンドル（@xxx）からチャンネルID + アップロードプレイリストIDを解決する。
// quota: 1 unit（search.list の専用枠は消費しない）
export async function resolveChannelByHandle(handle: string): Promise<ResolvedChannel> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (!apiKey) {
    throw new YouTubeMetadataError("YouTube Data APIキーが設定されていません。");
  }

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/channels");
  endpoint.searchParams.set("part", "contentDetails,snippet");
  endpoint.searchParams.set("forHandle", handle.startsWith("@") ? handle : `@${handle}`);
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint.toString(), { cache: "no-store" });
  const data = (await response.json()) as YouTubeChannelsResponse;

  if (!response.ok) {
    throw new YouTubeMetadataError(data.error?.message ?? "チャンネル情報の取得に失敗しました。");
  }

  const item = data.items?.[0];
  const uploadsPlaylistId = item?.contentDetails?.relatedPlaylists?.uploads;

  if (!item?.id || !uploadsPlaylistId) {
    throw new YouTubeMetadataError("チャンネルが見つかりませんでした。");
  }

  return {
    channelId: item.id,
    uploadsPlaylistId,
    channelTitle: item.snippet?.title ?? ""
  };
}

// チャンネルID（UCxxx）から直接、アップロードプレイリストIDを解決する。
// /channel/UCxxx 形式のURLを持つ活動者向けのフォールバック。quota: 1 unit
export async function resolveChannelById(channelId: string): Promise<ResolvedChannel> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (!apiKey) {
    throw new YouTubeMetadataError("YouTube Data APIキーが設定されていません。");
  }

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/channels");
  endpoint.searchParams.set("part", "contentDetails,snippet");
  endpoint.searchParams.set("id", channelId);
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint.toString(), { cache: "no-store" });
  const data = (await response.json()) as YouTubeChannelsResponse;

  if (!response.ok) {
    throw new YouTubeMetadataError(data.error?.message ?? "チャンネル情報の取得に失敗しました。");
  }

  const item = data.items?.[0];
  const uploadsPlaylistId = item?.contentDetails?.relatedPlaylists?.uploads;

  if (!item?.id || !uploadsPlaylistId) {
    throw new YouTubeMetadataError("チャンネルが見つかりませんでした。");
  }

  return {
    channelId: item.id,
    uploadsPlaylistId,
    channelTitle: item.snippet?.title ?? ""
  };
}

type YouTubePlaylistItemsResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      videoOwnerChannelId?: string;
      channelId?: string;
      videoOwnerChannelTitle?: string;
      channelTitle?: string;
      resourceId?: { videoId?: string };
      thumbnails?: {
        default?: YouTubeThumbnail;
        medium?: YouTubeThumbnail;
        high?: YouTubeThumbnail;
        standard?: YouTubeThumbnail;
        maxres?: YouTubeThumbnail;
      };
    };
    contentDetails?: { videoPublishedAt?: string };
  }>;
  nextPageToken?: string;
  error?: { message?: string };
};

export type PlaylistVideoItem = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
};

export type FetchPlaylistItemsOptions = {
  maxPages?: number; // 取得するページ数の上限（1ページ50件）。デフォルト1。
  publishedAfter?: Date; // この日時より古い動画に到達したら以降のページ取得を打ち切る
};

function mapPlaylistItem(
  item: NonNullable<YouTubePlaylistItemsResponse["items"]>[number]
): PlaylistVideoItem | null {
  const snippet = item.snippet;
  const videoId = snippet?.resourceId?.videoId;
  // contentDetails.videoPublishedAt はプレイリスト追加日ではなく動画公開日。優先して使う。
  const publishedAt = item.contentDetails?.videoPublishedAt ?? snippet?.publishedAt;

  if (!videoId || !snippet?.title || !publishedAt) {
    return null;
  }

  return {
    videoId,
    title: snippet.title,
    description: snippet.description ?? "",
    publishedAt,
    channelId: snippet.videoOwnerChannelId ?? snippet.channelId ?? "",
    channelTitle: snippet.videoOwnerChannelTitle ?? snippet.channelTitle ?? "",
    thumbnailUrl: pickBestThumbnailUrl(snippet.thumbnails)
  };
}

// アップロードプレイリストから動画を取得する。maxPages 分だけ pageToken で遡る。
// アップロードプレイリストは新しい順のため、publishedAfter より古い動画に到達したら
// それ以降のページは不要として打ち切る。 quota: 1 unit / page
export async function fetchPlaylistItems(
  playlistId: string,
  options: FetchPlaylistItemsOptions = {}
): Promise<PlaylistVideoItem[]> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (!apiKey) {
    throw new YouTubeMetadataError("YouTube Data APIキーが設定されていません。");
  }

  const maxPages = Math.max(options.maxPages ?? 1, 1);
  const items: PlaylistVideoItem[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const endpoint = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    endpoint.searchParams.set("part", "snippet,contentDetails");
    endpoint.searchParams.set("playlistId", playlistId);
    endpoint.searchParams.set("maxResults", "50");
    endpoint.searchParams.set("key", apiKey);
    if (pageToken) {
      endpoint.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(endpoint.toString(), { cache: "no-store" });
    const data = (await response.json()) as YouTubePlaylistItemsResponse;

    if (!response.ok) {
      throw new YouTubeMetadataError(data.error?.message ?? "プレイリストの取得に失敗しました。");
    }

    const pageItems = (data.items ?? [])
      .map(mapPlaylistItem)
      .filter((item): item is PlaylistVideoItem => item !== null);
    items.push(...pageItems);

    // publishedAfter を過ぎた動画に到達したら、それ以降のページは不要なので打ち切る。
    if (
      options.publishedAfter &&
      pageItems.some((item) => new Date(item.publishedAt) < options.publishedAfter!)
    ) {
      break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) {
      break;
    }
  }

  return items;
}

// ISO 8601 duration (PT1H2M3S) を秒に変換する
export function parseIsoDurationToSeconds(value: string): number | null {
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) {
    return null;
  }
  const [, d, h, m, s] = match;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

type YouTubeVideoDurationsResponse = {
  items?: Array<{ id?: string; contentDetails?: { duration?: string } }>;
  error?: { message?: string };
};

// 動画IDから長さ（秒）を取得する。IDは最大50件ずつまとめて指定する。 quota: 1 unit / 50件
export async function fetchVideoDurations(videoIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  if (videoIds.length === 0) {
    return result;
  }

  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (!apiKey) {
    throw new YouTubeMetadataError("YouTube Data APIキーが設定されていません。");
  }

  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);

    const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
    endpoint.searchParams.set("part", "contentDetails");
    endpoint.searchParams.set("id", chunk.join(","));
    endpoint.searchParams.set("key", apiKey);

    const response = await fetch(endpoint.toString(), { cache: "no-store" });
    const data = (await response.json()) as YouTubeVideoDurationsResponse;

    if (!response.ok) {
      throw new YouTubeMetadataError(data.error?.message ?? "動画長の取得に失敗しました。");
    }

    for (const item of data.items ?? []) {
      const seconds = parseIsoDurationToSeconds(item.contentDetails?.duration ?? "");
      if (item.id && seconds != null) {
        result.set(item.id, seconds);
      }
    }
  }

  return result;
}