"use server";

import { MasterDataStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { createAdminPerformer } from "@/lib/data/admin";
import { performerCreateSchema } from "@/lib/validations/master-data";

export async function createPerformerAction(formData: FormData) {
  await requireAdminPage();
  const parsed = performerCreateSchema.safeParse({
    name: formData.get("name"),
    groupId: formData.get("groupId"),
    youtubeUrl: formData.get("youtubeUrl"),
    officialUrl: formData.get("officialUrl"),
    status: formData.get("status") || "APPROVED"
  });

  if (!parsed.success) {
    return;
  }

  await createAdminPerformer({
    ...parsed.data,
    status: parsed.data.status as MasterDataStatus
  });
  revalidatePath("/admin/performers");
}
