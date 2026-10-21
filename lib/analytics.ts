// GA4 の測定IDは公開情報（ページのソースに出る）なので定数として直書きする。
// NEXT_PUBLIC_ 系の環境変数はビルド時埋め込みのため、Cloud Run の実行時環境変数では効かない。
export const GA_MEASUREMENT_ID = "G-K4WVZRRCZP";

// ローカル開発や Cloud Run の *.run.app URL からのアクセスは計測しない。
export const GA_ALLOWED_HOSTNAME = "oto-atsume.com";
