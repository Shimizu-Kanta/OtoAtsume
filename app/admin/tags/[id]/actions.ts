"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { addTagToPerformer, removeTagFromPerformer } from "@/lib/data/tags";

function revalidateTagPages(tagId: string) {
  revalidatePath(`/admin/tags/${tagId}`);
  revalidatePath("/admin/tags");
  revalidatePath("/admin/performers");
  revalidatePath("/performers");
}

export async function addPerformerToTagAction(tagId: string, formData: FormData) {
  await requireAdminPage();

  const performerId = formData.get("performerId");
  if (typeof performerId !== "string" || !performerId) {
    redirect(`/admin/tags/${tagId}?error=${encodeURIComponent("活動者を選択してください。")}`);
  }

  await addTagToPerformer(tagId, performerId);
  revalidateTagPages(tagId);
  redirect(`/admin/tags/${tagId}?added=1`);
}

export async function removePerformerFromTagAction(
  tagId: string,
  performerId: string,
  _formData?: FormData
) {
  await requireAdminPage();

  await removeTagFromPerformer(tagId, performerId);
  revalidateTagPages(tagId);
  redirect(`/admin/tags/${tagId}?removed=1`);
}
