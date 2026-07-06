import { NextResponse } from "next/server";

import { readJson } from "@/lib/api/response";
import { checkRouteRateLimit } from "@/lib/rate-limit/http";
import { fetchSourceMetadata, SourceMetadataError } from "@/lib/source-metadata/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = await checkRouteRateLimit(request, "api:source:metadata", {
      limit: 60,
      windowMs: 60 * 60 * 1000
    });

    if (limited) {
      return limited;
    }

    const body = await readJson(request);
    const sourceUrl = typeof body.url === "string" ? body.url : "";

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "情報元URLを入力してください。" },
        { status: 400 }
      );
    }

    const metadata = await fetchSourceMetadata(sourceUrl);
    const host = new URL(metadata.canonicalUrl).hostname;

    return NextResponse.json({
      metadata: {
        canonicalUrl: metadata.canonicalUrl,
        sourceTitle: metadata.title ?? metadata.canonicalUrl,
        description: "",
        publishedAt: metadata.publishedDate ? `${metadata.publishedDate}T00:00:00.000Z` : "",
        publishedDate: metadata.publishedDate ?? "",
        channelId: "",
        channelTitle: metadata.siteName ?? host,
        thumbnailUrl: metadata.imageUrl,
        tags: [],
        cache: "webpage"
      },
      suggestions: {
        performers: [],
        songs: []
      }
    });
  } catch (error) {
    console.error("Source metadata route failed", error);

    if (error instanceof SourceMetadataError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "情報元ページの取得に失敗しました。" },
      { status: 500 }
    );
  }
}