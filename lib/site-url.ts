// 公開サイトのベースURLを1箇所に集約する。
// Secret Manager / Cloud Run 経由で環境変数に改行（\r\n）や空白が混入しても
// 壊れたURLにならないよう、ここで一度だけ空白文字をすべて除去する。
// sitemap / JSON-LD / canonical / OGP など URL を組み立てる箇所はすべてこれを共有すること。
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://oto-atsume.com").replace(/\s+/g, "");

// パスを絶対URLに変換する。JSON-LD など文字列連結で絶対URLが必要な箇所で使う。
export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") {
    return siteUrl;
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
