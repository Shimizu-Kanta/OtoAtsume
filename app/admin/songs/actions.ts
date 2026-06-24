"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { createAdminSong } from "@/lib/data/admin";
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
