"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { createAdminSong, deleteAdminSongIfUnused } from "@/lib/data/admin";
import { songCreateSchema } from "@/lib/validations/master-data";

export async function createSongAction(formData: FormData) {
  await requireAdminPage();
  const parsed = songCreateSchema.safeParse({
    title: formData.get("title"),
    originalUrl: formData.get("originalUrl"),
    artistIds: formData.getAll("artistIds").map(String).filter(Boolean)
  });

  if (!parsed.success) {
    return;
  }

  await createAdminSong(parsed.data);
  revalidatePath("/admin/songs");
}

export async function deleteSongAction(songId: string, _formData?: FormData) {
  await requireAdminPage();

  const result = await deleteAdminSongIfUnused(songId);

  if (!result.ok) {
    if (result.reason === "hasCovers") {
      redirect(
        `/admin/songs?error=${encodeURIComponent(
          `この楽曲はカバー記録 ${result.coverCount} 件に使われているため削除できません。`
        )}`
      );
    }

    redirect(`/admin/songs?error=${encodeURIComponent("楽曲が見つかりません。")}`);
  }

  revalidatePath("/admin/songs");
  revalidatePath("/songs");
  redirect("/admin/songs?deleted=1");
}