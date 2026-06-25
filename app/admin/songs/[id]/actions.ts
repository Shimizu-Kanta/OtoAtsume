"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { updateAdminSong } from "@/lib/data/admin";
import { songUpdateSchema } from "@/lib/validations/master-data";

export async function updateSongAction(songId: string, formData: FormData) {
  await requireAdminPage();

  const parsed = songUpdateSchema.safeParse({
    title: formData.get("title"),
    originalUrl: formData.get("originalUrl"),
    artistIds: formData.getAll("artistIds").map(String).filter(Boolean),
    artistNames: formData.get("artistNames")
  });

  if (!parsed.success) {
    redirect(
      `/admin/songs/${songId}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力内容を確認してください。"
      )}`
    );
  }

  await updateAdminSong(songId, {
    ...parsed.data,
    originalUrl: parsed.data.originalUrl ?? null
  });

  revalidatePath("/admin/songs");
  revalidatePath(`/admin/songs/${songId}`);
  revalidatePath("/songs");
  revalidatePath(`/songs/${songId}`);
  redirect(`/admin/songs/${songId}?updated=1`);
}
