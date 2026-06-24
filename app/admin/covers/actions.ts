"use server";

import { ContentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { updateAdminCoverStatus } from "@/lib/data/admin";

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
