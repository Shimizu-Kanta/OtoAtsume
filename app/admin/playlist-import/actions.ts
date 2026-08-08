"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import type { CrawlMode } from "@/lib/crawl/cover-candidates";
import {
  importPlaylistCandidates,
  previewPlaylistFromUrl,
  type PlaylistImportResult,
  type PlaylistPreviewResult
} from "@/lib/crawl/playlist-import";

function normalizeMode(value: unknown): CrawlMode {
  return value === "KARAOKE_STREAM" ? "KARAOKE_STREAM" : "COVER_VIDEO";
}

export async function previewPlaylistAction(
  playlistUrl: string,
  mode: CrawlMode
): Promise<PlaylistPreviewResult> {
  await requireAdminPage();
  return previewPlaylistFromUrl(String(playlistUrl ?? ""), normalizeMode(mode));
}

export async function importPlaylistAction(
  videoIds: string[],
  mode: CrawlMode
): Promise<PlaylistImportResult> {
  await requireAdminPage();

  const result = await importPlaylistCandidates({
    videoIds: Array.isArray(videoIds) ? videoIds.map(String) : [],
    mode: normalizeMode(mode)
  });

  if (result.ok && result.created > 0) {
    revalidatePath("/admin/cover-candidates");
  }

  return result;
}
