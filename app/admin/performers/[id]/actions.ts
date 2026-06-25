"use server";

import { MasterDataStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { updateAdminPerformer } from "@/lib/data/admin";
import { normalizeNames } from "@/lib/utils";
import { performerUpdateSchema } from "@/lib/validations/master-data";

export async function updatePerformerAction(performerId: string, formData: FormData) {
  await requireAdminPage();

  const parsed = performerUpdateSchema.safeParse({
    name: formData.get("name"),
    groupId: formData.get("groupId"),
    youtubeUrl: formData.get("youtubeUrl"),
    officialUrl: formData.get("officialUrl"),
    status: formData.get("status") || "APPROVED",
    aliases: formData.get("aliases")
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
    status: parsed.data.status as MasterDataStatus,
    aliases: normalizeNames(parsed.data.aliases)
  });

  revalidatePath("/admin/performers");
  revalidatePath(`/admin/performers/${performerId}`);
  revalidatePath(`/performers/${performerId}`);
  redirect(`/admin/performers/${performerId}?updated=1`);
}
