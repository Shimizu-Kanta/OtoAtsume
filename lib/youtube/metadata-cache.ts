import type { YouTubeVideoMetadata } from "@/lib/youtube/client";
import { fetchYouTubeVideoMetadata } from "@/lib/youtube/client";
import { db } from "@/lib/db";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type CachedYouTubeVideoMetadataResult = {
  video: YouTubeVideoMetadata;
  cache: "hit" | "miss" | "refresh";
};

export async function getCachedYouTubeVideoMetadata(
  videoId: string,
  canonicalUrl: string
): Promise<CachedYouTubeVideoMetadataResult> {
  const cached = await db.youTubeVideoMetadataCache.findUnique({
    where: {
      videoId
    }
  });

  if (cached) {
    const cacheAgeMs = Date.now() - cached.fetchedAt.getTime();

    if (cacheAgeMs < CACHE_TTL_MS) {
      return {
        video: {
          videoId: cached.videoId,
          title: cached.sourceTitle,
          description: cached.description,
          publishedAt: cached.publishedAt.toISOString(),
          channelId: cached.channelId,
          channelTitle: cached.channelTitle,
          thumbnailUrl: cached.thumbnailUrl ?? undefined,
          tags: cached.tags
        },
        cache: "hit"
      };
    }
  }

  const fresh = await fetchYouTubeVideoMetadata(videoId);

  const saved = await db.youTubeVideoMetadataCache.upsert({
    where: {
      videoId
    },
    create: {
      videoId,
      canonicalUrl,
      sourceTitle: fresh.title,
      description: fresh.description,
      publishedAt: new Date(fresh.publishedAt),
      channelId: fresh.channelId,
      channelTitle: fresh.channelTitle,
      thumbnailUrl: fresh.thumbnailUrl,
      tags: fresh.tags,
      fetchedAt: new Date()
    },
    update: {
      canonicalUrl,
      sourceTitle: fresh.title,
      description: fresh.description,
      publishedAt: new Date(fresh.publishedAt),
      channelId: fresh.channelId,
      channelTitle: fresh.channelTitle,
      thumbnailUrl: fresh.thumbnailUrl,
      tags: fresh.tags,
      fetchedAt: new Date()
    }
  });

  return {
    video: {
      videoId: saved.videoId,
      title: saved.sourceTitle,
      description: saved.description,
      publishedAt: saved.publishedAt.toISOString(),
      channelId: saved.channelId,
      channelTitle: saved.channelTitle,
      thumbnailUrl: saved.thumbnailUrl ?? undefined,
      tags: saved.tags
    },
    cache: cached ? "refresh" : "miss"
  };
}