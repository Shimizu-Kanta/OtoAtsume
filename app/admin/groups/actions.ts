"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { createAdminGroup } from "@/lib/data/admin";
import { groupCreateSchema } from "@/lib/validations/master-data";

export async function createGroupAction(formData: FormData) {
  await requireAdminPage();
  const parsed = groupCreateSchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    return;
  }

  await createAdminGroup(parsed.data.name);
  revalidatePath("/admin/groups");
  revalidatePath("/admin/performers");
}
