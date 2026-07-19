"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { addTagToGroup, removeTagFromGroup } from "@/lib/data/tags";

function revalidateTagGroupPages(tagGroupId: string) {
  revalidatePath(`/admin/tag-groups/${tagGroupId}`);
  revalidatePath("/admin/tag-groups");
  revalidatePath("/admin/tags");
  revalidatePath("/performers");
  revalidatePath("/covers");
}

export async function addTagToGroupAction(tagGroupId: string, formData: FormData) {
  await requireAdminPage();

  const tagId = formData.get("tagId");
  if (typeof tagId !== "string" || !tagId) {
    redirect(`/admin/tag-groups/${tagGroupId}?error=${encodeURIComponent("タグを選択してください。")}`);
  }

  await addTagToGroup(tagGroupId, tagId);
  revalidateTagGroupPages(tagGroupId);
  redirect(`/admin/tag-groups/${tagGroupId}?added=1`);
}

export async function removeTagFromGroupAction(
  tagGroupId: string,
  tagId: string,
  _formData?: FormData
) {
  await requireAdminPage();

  await removeTagFromGroup(tagGroupId, tagId);
  revalidateTagGroupPages(tagGroupId);
  redirect(`/admin/tag-groups/${tagGroupId}?removed=1`);
}
