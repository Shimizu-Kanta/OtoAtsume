"use server";

import { CrawlKeywordKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPage } from "@/lib/auth/admin";
import {
  createCrawlKeyword,
  deleteCrawlKeyword,
  setCrawlKeywordEnabled
} from "@/lib/data/crawl-keywords";

function isValidKind(value: string): value is CrawlKeywordKind {
  return value === "COVER_VIDEO" || value === "KARAOKE_STREAM" || value === "EXCLUDE";
}

export async function createCrawlKeywordAction(formData: FormData) {
  await requireAdminPage();

  const keyword = (formData.get("keyword") ?? "").toString().trim();
  const kind = (formData.get("kind") ?? "").toString();

  if (!keyword || !isValidKind(kind)) {
    redirect(`/admin/crawl-keywords?error=${encodeURIComponent("キーワードと種別を入力してください。")}`);
  }

  await createCrawlKeyword(keyword, kind as CrawlKeywordKind);
  revalidatePath("/admin/crawl-keywords");
}

export async function toggleCrawlKeywordAction(id: string, enabled: boolean, _formData?: FormData) {
  await requireAdminPage();
  await setCrawlKeywordEnabled(id, enabled);
  revalidatePath("/admin/crawl-keywords");
}

export async function deleteCrawlKeywordAction(id: string, _formData?: FormData) {
  await requireAdminPage();
  await deleteCrawlKeyword(id);
  revalidatePath("/admin/crawl-keywords");
}
