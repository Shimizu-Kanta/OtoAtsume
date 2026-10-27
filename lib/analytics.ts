import { INTERNAL_FLAG_KEY } from "@/lib/telemetry/internal-viewer";

// GA4 の測定IDは公開情報（ページのソースに出る）なので定数として直書きする。
// NEXT_PUBLIC_ 系の環境変数はビルド時埋め込みのため、Cloud Run の実行時環境変数では効かない。
export const GA_MEASUREMENT_ID = "G-K4WVZRRCZP";

// ローカル開発や Cloud Run の *.run.app URL からのアクセスは計測しない。
export const GA_ALLOWED_HOSTNAME = "oto-atsume.com";

// SSR の HTML に直接埋め込む gtag の初期化スクリプト。
// next/script や useEffect 経由だとハイドレーション後まで送信が遅れ、数秒で離脱した訪問を取りこぼすため、
// HTML のパース時点で実行させる。
// 計測対象外（本番ドメイン以外・内部閲覧者）は GA 公式のオプトアウト `ga-disable-<ID>` を
// config より先に立て、その端末からは一切送信させない。
// 内部閲覧者の判定は lib/telemetry/internal-viewer.ts の syncInternalFlag / isInternalViewer と揃えること。
// App Router のクライアント遷移は GA4 の拡張計測（ブラウザの履歴イベントに基づくページの変更）で
// page_view になるため、send_page_view: false にしたり、ルート変更を監視して手動送信したりしない（二重計測になる）。
export const GA_INIT_SCRIPT = `(function(){
var off=location.hostname!==${JSON.stringify(GA_ALLOWED_HOSTNAME)};
var q=new URLSearchParams(location.search).get("internal");
if(q==="1")off=true;
try{
if(q==="1")localStorage.setItem(${JSON.stringify(INTERNAL_FLAG_KEY)},"1");
else if(q==="0")localStorage.removeItem(${JSON.stringify(INTERNAL_FLAG_KEY)});
if(localStorage.getItem(${JSON.stringify(INTERNAL_FLAG_KEY)})==="1")off=true;
}catch(e){}
if(off)window[${JSON.stringify(`ga-disable-${GA_MEASUREMENT_ID}`)}]=true;
})();
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag("js",new Date());
gtag("config",${JSON.stringify(GA_MEASUREMENT_ID)});`;
