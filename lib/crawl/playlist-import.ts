import { CoverCandidateType } from "@prisma/client";

import {
  MAX_PENDING_CANDIDATES,
  classifyVideo,
  resolveDurations,
  type CrawlMode
} from "@/lib/crawl/cover-candidates";
import { countCoversByVideoIds } from "@/lib/crawl/candidate-status";
import { getCrawlKeywordsByKind } from "@/lib/data/crawl-keywords";
import { db } from "@/lib/db";
import { cachePlaylistVideos } from "@/lib/youtube/metadata-cache";
import {
  YouTubeMetadataError,
  fetchPlaylistItemsDetailed,
  type PlaylistVideoItem
} from "@/lib/youtube/client";
import { extractYouTubePlaylistId } from "@/lib/youtube/url";
import {
  findPerformerSuggestions,
  findSongSuggestions,
  type PerformerSuggestion,
  type SongSuggestion
} from "@/lib/youtube/suggestions";

// 1回の取り込みで扱う動画数の上限。playlistItems.list は1ページ50件のため4ページ分。
export const MAX_PLAYLIST_IMPORT_VIDEOS = 200;
const MAX_PLAYLIST_PAGES = MAX_PLAYLIST_IMPORT_VIDEOS / 50;

// プレイリストには残るが再生できない動画。API はタイトルをこの固定文字列で返す。
const UNAVAILABLE_TITLES = new Set(["private video", "deleted video"]);

export type PlaylistImportItemStatus = "new" | "registered" | "candidateExists";

export type PlaylistImportPreviewItem = {
  videoId: string;
  videoUrl: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  detectedType: CoverCandidateType;
  status: PlaylistImportItemStatus;
  registeredCoverCount: number;
  performerSuggestions: PerformerSuggestion[];
  songSuggestions: SongSuggestion[];
  // 既定でチェックを入れるか。未登録かつ活動者が推定できたものだけ ON にする。
  defaultSelected: boolean;
  notes: string[];
};

export type PlaylistImportPreview = {
  playlistId: string;
  mode: CrawlMode;
  items: PlaylistImportPreviewItem[];
  truncated: boolean;
  skippedUnavailable: number;
  currentPending: number;
  remainingCapacity: number;
};

function isUnavailable(video: PlaylistVideoItem) {
  return UNAVAILABLE_TITLES.has(video.title.trim().toLowerCase());
}

function defaultTypeForMode(mode: CrawlMode): CoverCandidateType {
  return mode === "KARAOKE_STREAM"
    ? CoverCandidateType.KARAOKE_STREAM
    : CoverCandidateType.COVER_VIDEO;
}

// プレイリストは人手でまとめられている前提のため、キーワード不一致でも候補から外さず、
// 種別だけモード既定にフォールバックして注記を添える（最終判断は確認画面の管理者に委ねる）。
function resolveDetectedType(
  mode: CrawlMode,
  video: PlaylistVideoItem,
  durationSeconds: number | null,
  keywords: Awaited<ReturnType<typeof getCrawlKeywordsByKind>>
): { detectedType: CoverCandidateType; note: string | null } {
  const classified = classifyVideo(mode, video.title, video.description, durationSeconds, keywords);

  if (classified.result === "candidate") {
    return { detectedType: classified.detectedType, note: null };
  }

  const noteByResult: Record<string, string> = {
    excluded: "除外キーワードに一致しています",
    notMatched: "巡回キーワードに一致しません",
    tooLong: "歌ってみたとしては長い動画です"
  };

  return {
    detectedType: defaultTypeForMode(mode),
    note: noteByResult[classified.result] ?? null
  };
}

export async function previewPlaylistImport(input: {
  playlistId: string;
  mode: CrawlMode;
}): Promise<PlaylistImportPreview> {
  const { items: rawVideos, truncated } = await fetchPlaylistItemsDetailed(input.playlistId, {
    maxPages: MAX_PLAYLIST_PAGES
  });

  const available = rawVideos.slice(0, MAX_PLAYLIST_IMPORT_VIDEOS).filter((video) => !isUnavailable(video));
  const skippedUnavailable = Math.min(rawVideos.length, MAX_PLAYLIST_IMPORT_VIDEOS) - available.length;

  // 同じ動画がプレイリストに複数回入っていることがあるため、videoId で一意化する。
  const videos = Array.from(new Map(available.map((video) => [video.videoId, video])).values());

  if (videos.length === 0) {
    const currentPending = await db.coverCandidate.count({ where: { status: "PENDING" } });
    return {
      playlistId: input.playlistId,
      mode: input.mode,
      items: [],
      truncated,
      skippedUnavailable,
      currentPending,
      remainingCapacity: Math.max(0, MAX_PENDING_CANDIDATES - currentPending)
    };
  }

  await cachePlaylistVideos(videos);

  const videoIds = videos.map((video) => video.videoId);

  const [keywords, coverCounts, existingCandidates, currentPending, durations] = await Promise.all([
    getCrawlKeywordsByKind(),
    countCoversByVideoIds(db, videoIds),
    db.coverCandidate.findMany({ where: { videoId: { in: videoIds } }, select: { videoId: true } }),
    db.coverCandidate.count({ where: { status: "PENDING" } }),
    // 歌ってみたモードのみ動画長を使う（歌枠・ライブは長さを見ない）。
    input.mode === "COVER_VIDEO" ? resolveDurations(videos, false) : Promise.resolve(new Map<string, number>())
  ]);

  const candidateVideoIds = new Set(existingCandidates.map((row) => row.videoId));

  const items: PlaylistImportPreviewItem[] = [];

  for (const video of videos) {
    const durationSeconds = durations.get(video.videoId) ?? null;
    const { detectedType, note } = resolveDetectedType(input.mode, video, durationSeconds, keywords);

    const [performerSuggestions, songSuggestions] = await Promise.all([
      findPerformerSuggestions({
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        sourceTitle: video.title,
        description: video.description
      }),
      findSongSuggestions({ sourceTitle: video.title, description: video.description })
    ]);

    const registeredCoverCount = coverCounts.get(video.videoId) ?? 0;
    const status: PlaylistImportItemStatus =
      registeredCoverCount > 0 ? "registered" : candidateVideoIds.has(video.videoId) ? "candidateExists" : "new";

    const notes: string[] = [];
    if (note) {
      notes.push(note);
    }
    if (performerSuggestions.length === 0) {
      notes.push("活動者を推定できませんでした");
    }
    if (songSuggestions.length === 0) {
      notes.push("楽曲を推定できませんでした");
    }

    items.push({
      videoId: video.videoId,
      videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl ?? null,
      publishedAt: video.publishedAt,
      detectedType,
      status,
      registeredCoverCount,
      performerSuggestions,
      songSuggestions,
      defaultSelected: status === "new" && performerSuggestions.length > 0,
      notes
    });
  }

  return {
    playlistId: input.playlistId,
    mode: input.mode,
    items,
    truncated,
    skippedUnavailable,
    currentPending,
    remainingCapacity: Math.max(0, MAX_PENDING_CANDIDATES - currentPending)
  };
}

const PLAYLIST_URL_ERRORS: Record<string, string> = {
  invalidUrl: "YouTubeのプレイリストURLを入力してください。",
  noPlaylistId:
    "URLからプレイリストIDを取得できませんでした。`?list=` を含むプレイリストのURLを入力してください。",
  personalPlaylist:
    "「後で見る」「高く評価した動画」は本人しか参照できない個人用プレイリストのため取得できません。公開または限定公開のプレイリストを指定してください。"
};

export type PlaylistPreviewResult =
  | { ok: true; preview: PlaylistImportPreview }
  | { ok: false; error: string };

// URLの検証と取得をまとめる。URLの時点で弾ける場合は YouTube API を一切呼ばない。
export async function previewPlaylistFromUrl(
  playlistUrl: string,
  mode: CrawlMode
): Promise<PlaylistPreviewResult> {
  const parsed = extractYouTubePlaylistId(playlistUrl);

  if (!parsed.ok) {
    return { ok: false, error: PLAYLIST_URL_ERRORS[parsed.reason] ?? PLAYLIST_URL_ERRORS.invalidUrl };
  }

  try {
    const preview = await previewPlaylistImport({ playlistId: parsed.playlistId, mode });
    return { ok: true, preview };
  } catch (error) {
    if (error instanceof YouTubeMetadataError) {
      return { ok: false, error: error.message };
    }

    console.error("プレイリストの取得に失敗", error);
    return { ok: false, error: "プレイリストの取得に失敗しました。" };
  }
}

export type PlaylistImportResult =
  | { ok: true; created: number; skippedAlreadyKnown: number; errors: string[] }
  | { ok: false; error: string };

export async function importPlaylistCandidates(input: {
  videoIds: string[];
  mode: CrawlMode;
}): Promise<PlaylistImportResult> {
  const videoIds = Array.from(new Set(input.videoIds.filter(Boolean)));

  if (videoIds.length === 0) {
    return { ok: false, error: "取り込む動画が選択されていません。" };
  }

  // PENDING上限のシーリング。超過する場合は1件も書き込まずに中止する。
  const currentPending = await db.coverCandidate.count({ where: { status: "PENDING" } });
  const remaining = Math.max(0, MAX_PENDING_CANDIDATES - currentPending);

  if (videoIds.length > remaining) {
    return {
      ok: false,
      error: `現在PENDINGが${currentPending}件あります。あと${remaining}件まで追加できます。先に既存の候補を処理してください。`
    };
  }

  // クライアントから受け取るのは動画IDのみ。中身はプレビュー時に保存した
  // YouTubeVideoMetadataCache（API由来）から読み直す。
  const cached = await db.youTubeVideoMetadataCache.findMany({
    where: { videoId: { in: videoIds } }
  });
  const cachedById = new Map(cached.map((row) => [row.videoId, row]));

  const [coverCounts, existingCandidates, keywords] = await Promise.all([
    countCoversByVideoIds(db, videoIds),
    db.coverCandidate.findMany({ where: { videoId: { in: videoIds } }, select: { videoId: true } }),
    getCrawlKeywordsByKind()
  ]);
  const candidateVideoIds = new Set(existingCandidates.map((row) => row.videoId));

  let created = 0;
  let skippedAlreadyKnown = 0;
  const errors: string[] = [];

  for (const videoId of videoIds) {
    const video = cachedById.get(videoId);

    if (!video) {
      errors.push(`${videoId}: 動画情報が見つかりませんでした。再度取得してください。`);
      continue;
    }

    if ((coverCounts.get(videoId) ?? 0) > 0 || candidateVideoIds.has(videoId)) {
      skippedAlreadyKnown += 1;
      continue;
    }

    const { detectedType } = resolveDetectedType(
      input.mode,
      {
        videoId: video.videoId,
        title: video.sourceTitle,
        description: video.description,
        publishedAt: video.publishedAt.toISOString(),
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        thumbnailUrl: video.thumbnailUrl ?? undefined
      },
      video.durationSeconds,
      keywords
    );

    try {
      await db.coverCandidate.create({
        data: {
          videoId: video.videoId,
          videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          title: video.sourceTitle,
          description: video.description,
          channelId: video.channelId,
          channelTitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt,
          detectedType
        }
      });
      created += 1;
    } catch (error) {
      console.error(`候補の作成に失敗: videoId=${videoId}`, error);
      errors.push(`${video.sourceTitle}: 候補の作成に失敗しました。`);
    }
  }

  return { ok: true, created, skippedAlreadyKnown, errors };
}
