"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { createAdminArtist, deleteAdminArtistIfUnused } from "@/lib/data/admin";
import { artistCreateSchema } from "@/lib/validations/master-data";

export async function createArtistAction(formData: FormData) {
  await requireAdminPage();
  const parsed = artistCreateSchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    return;
  }

  await createAdminArtist(parsed.data.name);
  revalidatePath("/admin/artists");
}

export async function deleteArtistAction(artistId: string, _formData?: FormData) {
  await requireAdminPage();

  const result = await deleteAdminArtistIfUnused(artistId);

  if (!result.ok) {
    if (result.reason === "hasSongs") {
      redirect(
        `/admin/artists?error=${encodeURIComponent(
          `このアーティストは楽曲 ${result.songCount} 件に使われているため削除できません。`
        )}`
      );
    }

    redirect(`/admin/artists?error=${encodeURIComponent("アーティストが見つかりません。")}`);
  }

  revalidatePath("/admin/artists");
  revalidatePath("/admin/songs");
  revalidatePath("/songs");
  redirect("/admin/artists?deleted=1");
}