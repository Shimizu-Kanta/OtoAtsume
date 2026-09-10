import { z } from "zod";

import { optionalText } from "@/lib/validations/shared";

// slug は URL の一部になる。英小文字・数字・ハイフンのみに正規化し、
// 先頭末尾のハイフンと連続ハイフンを潰す。空になったら弾く。
export function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// 記事末尾のリンク1件。サイト内（/ 始まり）と https:// のみ許可し、
// javascript: など危険なスキームを弾く。
const featureLinkUrl = z
  .string()
  .trim()
  .min(1, "URLを入力してください。")
  .max(2000)
  .refine(
    (value) => value.startsWith("/") || /^https:\/\//i.test(value),
    "URLは https:// またはサイト内リンク（/ 始まり）のみ指定できます。"
  );

export const featureLinkSchema = z.object({
  url: featureLinkUrl,
  label: z.string().trim().min(1, "ラベルを入力してください。").max(120),
  note: optionalText(200)
});

export type FeatureLink = z.infer<typeof featureLinkSchema>;

// links 列に入っている未知の値（過去データ・手編集）を安全に配列へ変換する。
// 壊れた要素は落とし、表示側が必ず FeatureLink[] を受け取れるようにする。
export function parseFeatureLinks(value: unknown): FeatureLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const parsed = featureLinkSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

const featureItemInputSchema = z.object({
  coverId: z.string().trim().min(1),
  comment: z.string().trim().min(1, "コメントを入力してください。").max(4000)
});

export type FeatureItemInput = z.infer<typeof featureItemInputSchema>;

export const featureInputSchema = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください。").max(200),
  slug: z.preprocess(
    (value) => (typeof value === "string" ? normalizeSlug(value) : value),
    z
      .string()
      .min(1, "slug を入力してください（英数字とハイフン）。")
      .max(120)
      .regex(/^[a-z0-9-]+$/)
  ),
  lead: z.string().trim().min(1, "序文を入力してください。").max(8000),
  outro: optionalText(8000),
  items: z.array(featureItemInputSchema).min(1, "曲を1件以上追加してください。").max(50),
  links: z.array(featureLinkSchema).max(30).default([])
});

export type FeatureInput = z.infer<typeof featureInputSchema>;
