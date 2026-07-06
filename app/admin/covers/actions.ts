"use server";

import { ContentStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { deleteAdminCover, updateAdminCoverStatus } from "@/lib/data/admin";

export async function updateCoverStatusAction(formData: FormData) {
  await requireAdminPage();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ContentStatus;

  if (!id || !Object.values(ContentStatus).includes(status)) {
    return;
  }

  await updateAdminCoverStatus(id, status);
  revalidatePath("/admin/covers");
}

export async function deleteCoverAction(formData: FormData) {
  await requireAdminPage();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect(`/admin/covers?error=${encodeURIComponent("削除対象が見つかりません。")}`);
  }

  const result = await deleteAdminCover(id);

  if (!result.ok) {
    redirect(`/admin/covers?error=${encodeURIComponent("カバー記録が見つかりません。")}`);
  }

  revalidatePath("/admin/covers");
  revalidatePath(`/covers/${id}`);
  redirect("/admin/covers?deleted=1");
}