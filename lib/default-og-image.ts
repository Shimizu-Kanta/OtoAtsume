// サイト共通の既定OGP画像(public/ogp.png)。
// Next.js の metadata は openGraph / twitter をキー単位で上書きするため、
// ページ側で openGraph や twitter を書くとレイアウトの images が消える。
// 個別の OGP 画像を持たないページは、openGraph / twitter を書くときに必ずこれを images に入れること。
export const DEFAULT_OG_IMAGE = {
  url: "/ogp.png",
  width: 1200,
  height: 630,
  alt: "おとあつめ"
};
