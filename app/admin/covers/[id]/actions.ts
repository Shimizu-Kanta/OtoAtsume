"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { updateAdminCover } from "@/lib/data/covers";
import { adminCoverEditSchema } from "@/lib/validations/cover";

export async function updateAdminCoverAction(coverId: string, formData: FormData) {
  await requireAdminPage();

  const parsed = adminCoverEditSchema.safeParse({
    performerIds: formData.getAll("performerIds").map(String).filter(Boolean),
    performerNames: formData.get("performerNames"),
    songTitle: formData.get("songTitle"),
    artistNames: formData.get("artistNames"),
    performedAt: formData.get("performedAt"),
    coverType: formData.get("coverType"),
    sourceUrl: formData.get("sourceUrl"),
    sourceTitle: formData.get("sourceTitle"),
    timestampSeconds: formData.get("timestampSeconds"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    redirect(
      `/admin/covers/${coverId}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力内容を確認してください。"
      )}`
    );
  }

  await updateAdminCover(coverId, parsed.data);
  revalidatePath(`/admin/covers/${coverId}`);
  revalidatePath("/admin/covers");
  revalidatePath(`/covers/${coverId}`);
  redirect(`/admin/covers/${coverId}?updated=1`);
}
