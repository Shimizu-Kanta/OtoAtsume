"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import {
  coerceImportInput,
  createImportPreviewKey,
  executeMasterImport,
  previewMasterImport
} from "@/lib/imports/master-data";
import type { ImportActionState } from "@/lib/imports/types";

export async function submitImportAction(
  previousState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  await requireAdminPage();

  const input = coerceImportInput(formData);
  const intent = formData.get("intent") === "import" ? "import" : "preview";

  if (intent === "preview") {
    return previewMasterImport(input);
  }

  if (previousState.status !== "preview" || previousState.previewKey !== createImportPreviewKey(input)) {
    const state = await previewMasterImport(input);
    return {
      ...state,
      status: "error",
      message: "プレビュー後に入力が変更されています。もう一度プレビューしてください。"
    };
  }

  if (previousState.summary && previousState.summary.errorCount > 0) {
    return {
      ...previousState,
      status: "error",
      message: "エラーがあるためインポートを実行できません。"
    };
  }

  const state = await executeMasterImport(input);
  if (state.status === "imported") {
    revalidatePath("/admin");
    revalidatePath("/admin/imports");
    revalidatePath("/admin/performers");
    revalidatePath("/admin/songs");
    revalidatePath("/admin/artists");
    revalidatePath("/admin/performer-applications");
  }

  return state;
}
