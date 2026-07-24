// 広告を出力してよいページのホワイトリスト（除外リスト方式ではなく明示的な許可リスト）。
// 承認取得後の初期運用では一覧ページに絞る。詳細ページ（/covers/:id など）への
// 展開は承認後に別途検討する前提で、この Set に追加するだけで拡張できるようにしている。
const AD_ENABLED_PATHS = new Set<string>(["/", "/covers", "/performers", "/songs", "/groups"]);

// pathname はクエリ・末尾スラッシュを含まない厳密なパスであること（usePathname の戻り値）。
// hasResults が false（検索結果0件など）の場合は、パスがホワイトリストにあっても広告を出さない。
export function isAdEnabledPath(pathname: string, hasResults: boolean): boolean {
  if (!hasResults) {
    return false;
  }

  return AD_ENABLED_PATHS.has(pathname);
}
