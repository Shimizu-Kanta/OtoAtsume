"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import {
  createFeature,
  deleteFeature,
  publishFeature,
  unpublishFeature,
  updateFeature
} from "@/lib/data/features";
import { featureInputSchema } from "@/lib/validations/feature";

export type FeatureFormState = { error?: string };

function safeJsonArray(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseFeatureForm(formData: FormData) {
  return featureInputSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    lead: formData.get("lead"),
    outro: formData.get("outro"),
    items: safeJsonArray(formData.get("itemsJson")),
    links: safeJsonArray(formData.get("linksJson"))
  });
}

// slug の一意制約違反（P2002）だけは文言を分けて、書き手が slug を直せるようにする。
function isUniqueSlugError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    (error.meta?.target as string[] | undefined)?.includes("slug") !== false
  );
}

// 新規・編集で共通の保存アクション。useActionState 経由で使うため、
// 検証失敗時は redirect せず error を返して入力内容を保持する。
export async function saveFeatureAction(
  id: string | null,
  _prevState: FeatureFormState,
  formData: FormData
): Promise<FeatureFormState> {
  await requireAdminPage();

  const parsed = parseFeatureForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" };
  }

  try {
    if (id) {
      await updateFeature(id, parsed.data);
    } else {
      await createFeature(parsed.data);
    }
  } catch (error) {
    if (isUniqueSlugError(error)) {
      return { error: "この slug は既に使われています。別の slug にしてください。" };
    }
    console.error("saveFeatureAction failed", error);
    return { error: "保存に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath("/admin/features");
  revalidatePath("/features");
  redirect("/admin/features?saved=1");
}

export async function deleteFeatureAction(id: string, _formData?: FormData) {
  await requireAdminPage();

  await deleteFeature(id);

  revalidatePath("/admin/features");
  revalidatePath("/features");
  redirect("/admin/features?deleted=1");
}

export async function publishFeatureAction(id: string, _formData?: FormData) {
  await requireAdminPage();

  await publishFeature(id);

  revalidatePath("/admin/features");
  revalidatePath("/features");
  redirect(`/admin/features/${id}/edit?published=1`);
}

export async function unpublishFeatureAction(id: string, _formData?: FormData) {
  await requireAdminPage();

  await unpublishFeature(id);

  revalidatePath("/admin/features");
  revalidatePath("/features");
  redirect(`/admin/features/${id}/edit?unpublished=1`);
}
