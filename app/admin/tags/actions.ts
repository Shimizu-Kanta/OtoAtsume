"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { createAdminTag, deleteAdminTagIfUnused, updateAdminTag } from "@/lib/data/tags";
import { tagCreateSchema } from "@/lib/validations/master-data";

function errorRedirect(message: string): never {
  redirect(`/admin/tags?error=${encodeURIComponent(message)}`);
}

export async function createTagAction(formData: FormData) {
  await requireAdminPage();

  const parsed = tagCreateSchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    errorRedirect(parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  }

  await createAdminTag(parsed.data.name);
  revalidatePath("/admin/tags");
  revalidatePath("/performers");
}

export async function updateTagAction(tagId: string, formData: FormData) {
  await requireAdminPage();

  const parsed = tagCreateSchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    errorRedirect(parsed.error.issues[0]?.message ?? "入力内容を確認してください。");
  }

  await updateAdminTag(tagId, parsed.data.name);
  revalidatePath("/admin/tags");
  revalidatePath("/admin/performers");
  revalidatePath("/performers");
  redirect("/admin/tags?updated=1");
}

export async function deleteTagAction(tagId: string, _formData?: FormData) {
  await requireAdminPage();

  const result = await deleteAdminTagIfUnused(tagId);

  if (!result.ok) {
    if (result.reason === "hasPerformers") {
      errorRedirect(`このタグは活動者 ${result.performerCount} 件に使われているため削除できません。`);
    }

    errorRedirect("タグが見つかりません。");
  }

  revalidatePath("/admin/tags");
  revalidatePath("/admin/performers");
  revalidatePath("/performers");
  redirect("/admin/tags?deleted=1");
}