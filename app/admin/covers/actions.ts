"use server";

import { ContentStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { deleteAdminCover, updateAdminCoverStatus, updateAdminCoverStatuses } from "@/lib/data/admin";

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

// 一括変更で一度に扱う上限。1 ページの表示件数より十分大きくしてある。
const BULK_STATUS_LIMIT = 200;

// 結果表示用のパラメータは引き継がない(前回の結果が残って見えるのを防ぐ)。
const transientCoverListParams = ["bulkUpdated", "deleted", "error"];

export async function bulkUpdateCoverStatusAction(formData: FormData) {
  await requireAdminPage();

  const ids = Array.from(
    new Set(formData.getAll("ids").map((value) => String(value)).filter(Boolean))
  );
  const status = String(formData.get("status") ?? "") as ContentStatus;

  if (ids.length === 0 || ids.length > BULK_STATUS_LIMIT || !Object.values(ContentStatus).includes(status)) {
    return;
  }

  const result = await updateAdminCoverStatuses(ids, status);
  revalidatePath("/admin/covers");

  // 今の検索条件・ページ番号を保ったまま一覧に戻す。
  const query = new URLSearchParams(String(formData.get("returnQuery") ?? ""));
  for (const key of transientCoverListParams) {
    query.delete(key);
  }
  query.set("bulkUpdated", String(result.count));
  redirect(`/admin/covers?${query.toString()}`);
}

export async function deleteCoverAction(formData: FormData) {
  await requireAdminPage();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect(`/admin/covers?error=${encodeURIComponent("削除対象が見つかりません。")}`);
  }

  const result = await deleteAdminCover(id);

  if (!result.ok) {
    if (result.reason === "inUse") {
      redirect(
        `/admin/covers?error=${encodeURIComponent(
          `この歌唱記録は特集 ${result.featureCount} 件で紹介されているため削除できません。先に特集から外してください。`
        )}`
      );
    }

    redirect(`/admin/covers?error=${encodeURIComponent("歌唱記録が見つかりません。")}`);
  }

  revalidatePath("/admin/covers");
  revalidatePath(`/covers/${id}`);
  redirect("/admin/covers?deleted=1");
}