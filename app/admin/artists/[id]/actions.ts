"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { updateAdminArtist } from "@/lib/data/admin";
import { artistCreateSchema } from "@/lib/validations/master-data";

export async function updateArtistAction(artistId: string, formData: FormData) {
  await requireAdminPage();

  const parsed = artistCreateSchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    redirect(
      `/admin/artists/${artistId}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力内容を確認してください。"
      )}`
    );
  }

  try {
    await updateAdminArtist(artistId, parsed.data.name);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/admin/artists/${artistId}?error=${encodeURIComponent("同じ名前のアーティストが既に存在します。")}`);
    }
    throw error;
  }

  revalidatePath("/admin/artists");
  revalidatePath(`/admin/artists/${artistId}`);
  revalidatePath("/songs");
  redirect(`/admin/artists/${artistId}?updated=1`);
}
