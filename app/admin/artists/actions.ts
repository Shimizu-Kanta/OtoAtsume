"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { createAdminArtist } from "@/lib/data/admin";
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
