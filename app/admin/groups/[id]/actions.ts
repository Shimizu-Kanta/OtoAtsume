"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { updateAdminGroup } from "@/lib/data/admin";
import { groupCreateSchema } from "@/lib/validations/master-data";

export async function updateGroupAction(groupId: string, formData: FormData) {
  await requireAdminPage();

  const parsed = groupCreateSchema.safeParse({
    name: formData.get("name")
  });

  if (!parsed.success) {
    redirect(
      `/admin/groups/${groupId}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力内容を確認してください。"
      )}`
    );
  }

  try {
    await updateAdminGroup(groupId, parsed.data.name);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/admin/groups/${groupId}?error=${encodeURIComponent("同じ名前のグループが既に存在します。")}`);
    }
    throw error;
  }

  revalidatePath("/admin/groups");
  revalidatePath(`/admin/groups/${groupId}`);
  revalidatePath("/admin/performers");
  revalidatePath("/performers");
  redirect(`/admin/groups/${groupId}?updated=1`);
}
