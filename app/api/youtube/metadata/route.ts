import { NextResponse } from "next/server";

import { MasterDataStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { readJson } from "@/lib/api/response";
import { checkRouteRateLimit } from "@/lib/rate-limit/http";
import { YouTubeMetadataError } from "@/lib/youtube/client";
import { getCachedYouTubeVideoMetadata } from "@/lib/youtube/metadata-cache";
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

type PerformerSuggestionInput = {
  channelId: string;
  channelTitle: string;
  sourceTitle: string;
  description: string;
};

type PerformerSuggestion = {
  id: string;
  name: string;
  groupName: string | null;
  reason: "channel" | "title" | "description" | "url";
};

async function findPerformerSuggestions(input: PerformerSuggestionInput): Promise<PerformerSuggestion[]> {
  const performers = await db.performer.findMany({
    where: {
      status: MasterDataStatus.APPROVED
    },
    select: {
      id: true,
      name: true,
      youtubeUrl: true,
      group: {
        select: {
          name: true
        }
      },
      aliases: {
        select: {
          alias: true
        }
      }
    },
    orderBy: {
      name: "asc"
    },
    take: 1000
  });

  const channelTitle = normalizeText(input.channelTitle);
  const sourceTitle = normalizeText(input.sourceTitle);
  const description = normalizeText(input.description);
  const channelId = normalizeText(input.channelId);

  const suggestions = new Map<string, PerformerSuggestion & { score: number }>();

  for (const performer of performers) {
    const names = [performer.name, ...performer.aliases.map((alias) => alias.alias)]
      .map(normalizeText)
      .filter(Boolean);

    let matched: { reason: PerformerSuggestion["reason"]; score: number } | null = null;

    const youtubeUrl = normalizeText(performer.youtubeUrl ?? "");

    if (youtubeUrl && channelId && youtubeUrl.includes(channelId)) {
      matched = { reason: "url", score: 100 };
    } else if (names.some((name) => channelTitle.includes(name) || name.includes(channelTitle))) {
      matched = { reason: "channel", score: 90 };
    } else if (names.some((name) => sourceTitle.includes(name))) {
      matched = { reason: "title", score: 70 };
    } else if (names.some((name) => description.includes(name))) {
      matched = { reason: "description", score: 50 };
    }

    if (!matched) {
      continue;
    }

    const current = suggestions.get(performer.id);

    if (!current || matched.score > current.score) {
      suggestions.set(performer.id, {
        id: performer.id,
        name: performer.name,
        groupName: performer.group?.name ?? null,
        reason: matched.reason,
        score: matched.score
      });
    }
  }

  return Array.from(suggestions.values())
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ja"))
    .slice(0, 8)
    .map(({ score: _score, ...suggestion }) => suggestion);
}

type SongSuggestionInput = {
  sourceTitle: string;
  description: string;
};

type SongSuggestion = {
  id: string;
  title: string;
  artistNames: string[];
  reason: "title" | "description" | "artist";
};

async function findSongSuggestions(input: SongSuggestionInput): Promise<SongSuggestion[]> {
  const songs = await db.song.findMany({
    select: {
      id: true,
      title: true,
      artists: {
        select: {
          artist: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      title: "asc"
    },
    take: 1000
  });

  const sourceTitle = normalizeText(input.sourceTitle);
  const description = normalizeText(input.description);

  const suggestions = new Map<string, SongSuggestion & { score: number }>();

  for (const song of songs) {
    const title = normalizeText(song.title);
    const artistNames = song.artists.map(({ artist }) => artist.name);
    const normalizedArtistNames = artistNames.map(normalizeText).filter(Boolean);

    let matched: { reason: SongSuggestion["reason"]; score: number } | null = null;

    if (title && sourceTitle.includes(title)) {
      matched = { reason: "title", score: 100 };
    } else if (title && description.includes(title)) {
      matched = { reason: "description", score: 80 };
    } else if (
      title &&
      normalizedArtistNames.some((artistName) => sourceTitle.includes(title) && sourceTitle.includes(artistName))
    ) {
      matched = { reason: "artist", score: 70 };
    } else if (
      title &&
      normalizedArtistNames.some((artistName) => description.includes(title) && description.includes(artistName))
    ) {
      matched = { reason: "artist", score: 60 };
    }

    if (!matched) {
      continue;
    }

    const current = suggestions.get(song.id);

    if (!current || matched.score > current.score) {
      suggestions.set(song.id, {
        id: song.id,
        title: song.title,
        artistNames,
        reason: matched.reason,
        score: matched.score
      });
    }
  }

  return Array.from(suggestions.values())
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ja"))
    .slice(0, 8)
    .map(({ score: _score, ...suggestion }) => suggestion);
}

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}