"use server";

import { MasterDataStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { updateAdminPerformer } from "@/lib/data/admin";
import { normalizeNames } from "@/lib/utils";
import { normalizeTagNames } from "@/lib/validations/performer-profile";
import { performerUpdateSchema } from "@/lib/validations/master-data";

export async function updatePerformerAction(performerId: string, formData: FormData) {
  await requireAdminPage();

  const parsed = performerUpdateSchema.safeParse({
    name: formData.get("name"),
    groupId: formData.get("groupId"),
    youtubeUrl: formData.get("youtubeUrl"),
    officialUrl: formData.get("officialUrl"),
    colorCode: formData.get("colorCode"),
    debutDate: formData.get("debutDate"),
    status: formData.get("status") || "APPROVED",
    aliases: formData.get("aliases"),
    tags: formData.get("tags")
  });

  if (!parsed.success) {
    redirect(
      `/admin/performers/${performerId}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力内容を確認してください。"
      )}`
    );
  }

  await updateAdminPerformer(performerId, {
    ...parsed.data,
    groupId: parsed.data.groupId ?? null,
    youtubeUrl: parsed.data.youtubeUrl ?? null,
    officialUrl: parsed.data.officialUrl ?? null,
    colorCode: parsed.data.colorCode ?? null,
    debutDate: parsed.data.debutDate ?? null,
    status: parsed.data.status as MasterDataStatus,
    aliases: normalizeNames(parsed.data.aliases),
    tags: normalizeTagNames(parsed.data.tags)
  });

  revalidatePath("/admin/performers");
  revalidatePath("/admin/tags");
  revalidatePath("/performers");
  revalidatePath(`/admin/performers/${performerId}`);
  revalidatePath(`/performers/${performerId}`);
  redirect(`/admin/performers/${performerId}?updated=1`);
}
