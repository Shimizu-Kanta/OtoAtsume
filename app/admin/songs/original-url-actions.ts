"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import {
  adoptOriginalUrlCandidate,
  dismissOriginalUrlCandidates,
  refetchOriginalUrlCandidatesForSong,
  runOriginalUrlCandidateBatch
} from "@/lib/original-url-suggestions";

export async function runOriginalUrlCandidateBatchAction() {
  await requireAdminPage();
  const result = await runOriginalUrlCandidateBatch();
  revalidatePath("/admin/songs");
  return result;
}

export async function adoptOriginalUrlCandidateAction(songId: string, videoId: string) {
  await requireAdminPage();
  await adoptOriginalUrlCandidate(songId, videoId);
  revalidatePath("/admin/songs");
  revalidatePath("/songs");
}

export async function dismissOriginalUrlCandidatesAction(songId: string) {
  await requireAdminPage();
  await dismissOriginalUrlCandidates(songId);
  revalidatePath("/admin/songs");
}

export async function refetchOriginalUrlCandidatesAction(songId: string) {
  await requireAdminPage();
  await refetchOriginalUrlCandidatesForSong(songId);
  revalidatePath("/admin/songs");
}
