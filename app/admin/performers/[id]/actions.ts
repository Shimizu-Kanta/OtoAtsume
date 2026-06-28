"use server";

import { MasterDataStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import { deleteAdminPerformerIfUnused, updateAdminPerformer } from "@/lib/data/admin";
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
    birthday: formData.get("birthday"),
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
    birthday: parsed.data.birthday ?? null,
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

export async function approvePerformerAction(performerId: string) {
  await requireAdminPage();

  await updateAdminPerformer(performerId, {
    status: MasterDataStatus.APPROVED
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/performers");
  revalidatePath("/admin/tags");
  revalidatePath("/performers");
  revalidatePath(`/admin/performers/${performerId}`);
  revalidatePath(`/performers/${performerId}`);

  redirect(`/admin/performers/${performerId}?approved=1`);
}

export async function deletePerformerAction(performerId: string, formData: FormData) {
  await requireAdminPage();

  const confirmName = String(formData.get("confirmName") ?? "");
  let redirectTo = "/admin/performers";

  try {
    const result = await deleteAdminPerformerIfUnused(performerId, confirmName);

    if (result.ok) {
      revalidatePath("/admin/performers");
      revalidatePath("/admin/tags");
      revalidatePath("/performers");
      revalidatePath("/covers");
      revalidatePath(`/admin/performers/${performerId}`);
      revalidatePath(`/performers/${performerId}`);

      redirectTo = `/admin/performers?deleted=${encodeURIComponent(result.name)}`;
    } else if (result.reason === "notFound") {
      redirectTo = `/admin/performers?error=${encodeURIComponent("活動者が見つかりません。")}`;
    } else if (result.reason === "nameMismatch") {
      redirectTo = `/admin/performers/${performerId}?error=${encodeURIComponent(
        `確認用の活動者名が一致しません。「${result.name}」と入力してください。`
      )}`;
    } else if (result.reason === "hasCovers") {
      redirectTo = `/admin/performers/${performerId}?error=${encodeURIComponent(
        `この活動者は ${result.coverCount} 件のカバー記録に紐づいているため削除できません。先に紐づきを修正してください。`
      )}`;
    }
  } catch (error) {
    console.error("deletePerformerAction failed", error);
    redirectTo = `/admin/performers/${performerId}?error=${encodeURIComponent(
      "活動者の削除に失敗しました。時間をおいて再試行してください。"
    )}`;
  }

  redirect(redirectTo);
}
