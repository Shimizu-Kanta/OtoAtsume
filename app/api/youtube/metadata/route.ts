import { NextResponse } from "next/server";

import { readJson } from "@/lib/api/response";
import { checkRouteRateLimit } from "@/lib/rate-limit/http";
import { YouTubeMetadataError } from "@/lib/youtube/client";
import { getCachedYouTubeVideoMetadata } from "@/lib/youtube/metadata-cache";
import { findPerformerSuggestions, findSongSuggestions } from "@/lib/youtube/suggestions";
import { parseYouTubeUrl } from "@/lib/youtube/url";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = await checkRouteRateLimit(request, "api:youtube:metadata", {
      limit: 60,
      windowMs: 60 * 60 * 1000
    });

    if (limited) {
      return limited;
    }

    const body = await readJson(request);
    const sourceUrl = typeof body.url === "string" ? body.url : "";
    const parsed = parseYouTubeUrl(sourceUrl);

    if (!parsed) {
      return NextResponse.json(
        { error: "対応しているYouTube URLを入力してください。" },
        { status: 400 }
      );
    }

    const { video, cache } = await getCachedYouTubeVideoMetadata(
      parsed.videoId,
      parsed.canonicalUrl
    );

    const [performerSuggestions, songSuggestions] = await Promise.all([
      findPerformerSuggestions({
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        sourceTitle: video.title,
        description: video.description
      }),
      findSongSuggestions({
        sourceTitle: video.title,
        description: video.description
      })
    ]);

    return NextResponse.json(
      {
        metadata: {
          videoId: parsed.videoId,
          canonicalUrl: parsed.canonicalUrl,
          timestampSeconds: parsed.timestampSeconds,
          sourceTitle: video.title,
          description: video.description,
          publishedAt: video.publishedAt,
          publishedDate: video.publishedAt.slice(0, 10),
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl,
          tags: video.tags,
          cache
        },
        suggestions: {
          performers: performerSuggestions,
          songs: songSuggestions
        }
      },
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );
  } catch (error) {
    console.error("YouTube metadata route failed", error);

    if (error instanceof YouTubeMetadataError) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "YouTube動画情報の取得に失敗しました。";

    return NextResponse.json(
      {
        error: message,
        name: error instanceof Error ? error.name : "UnknownError"
      },
      { status: 500 }
    );
  }
}
