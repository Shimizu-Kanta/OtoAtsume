import { NextResponse } from "next/server";

import { readJson } from "@/lib/api/response";
import { checkRouteRateLimit } from "@/lib/rate-limit/http";
import { YouTubeMetadataError } from "@/lib/youtube/client";
import { getCachedYouTubeVideoMetadata } from "@/lib/youtube/metadata-cache";
import { findPerformerSuggestions, findSongSuggestions } from "@/lib/youtube/suggestions";
import { toTokyoDateKey } from "@/lib/utils";
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
          // 歌唱日の初期値に使うため、UTC ではなく日本時間の日付にする。
          publishedDate: toTokyoDateKey(video.publishedAt),
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

    // 想定外の例外は内部情報（DBエラー文言など）を含みうるため、利用者には汎用文言だけ返す。
    return NextResponse.json(
      { error: "YouTube動画情報の取得に失敗しました。" },
      { status: 500 }
    );
  }
}
