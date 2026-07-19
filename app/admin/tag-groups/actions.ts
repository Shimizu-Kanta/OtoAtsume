"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { createAdminTagGroup, deleteAdminTagGroup, updateAdminTagGroup } from "@/lib/data/tags";

function errorRedirect(message: string): never {
  redirect(`/admin/tag-groups?error=${encodeURIComponent(message)}`);
}

function parseSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function revalidateTagGroupPages() {
  revalidatePath("/admin/tag-groups");
  revalidatePath("/performers");
  revalidatePath("/covers");
}

export async function createTagGroupAction(formData: FormData) {
  await requireAdminPage();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    errorRedirect("グループ名を入力してください。");
  }

  await createAdminTagGroup(name, parseSortOrder(formData.get("sortOrder")));
  revalidateTagGroupPages();
}

export async function updateTagGroupAction(id: string, formData: FormData) {
  await requireAdminPage();

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) {
    errorRedirect("グループ名を入力してください。");
  }

  await updateAdminTagGroup(id, { name, sortOrder: parseSortOrder(formData.get("sortOrder")) });
  revalidateTagGroupPages();
  redirect("/admin/tag-groups?updated=1");
}

export async function deleteTagGroupAction(id: string, _formData?: FormData) {
  await requireAdminPage();

  const result = await deleteAdminTagGroup(id);
  if (!result.ok) {
    errorRedirect("グループが見つかりません。");
  }

  revalidateTagGroupPages();
  redirect("/admin/tag-groups?deleted=1");
}
