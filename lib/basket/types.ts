import type { CoverType } from "@prisma/client";

// /api/basket が返す、かご1件分の表示・再生に必要な情報。
// localStorage には ID しか持たないため、描画のたびにここへ解決する。
export type BasketItem = {
  id: string;
  songTitle: string;
  performerNames: string;
  performerColor: string | null;
  sourceUrl: string;
  sourceVideoId: string | null;
  sourceTitle: string | null;
  thumbnailUrl: string | null;
  coverType: CoverType;
  // 歌枠から1曲を切り出すための区間。timestampSeconds が無い記録は
  // 動画まるごとが1曲なので、どちらも null になる。
  startSeconds: number | null;
  endSeconds: number | null;
};

// サイト内で試聴できるのは YouTube の動画 ID が取れるものだけ。
// それ以外（非 YouTube の情報元など）は再生ボタンを出さずリンクのみにする。
export function isPreviewable(item: BasketItem) {
  return Boolean(item.sourceVideoId);
}
