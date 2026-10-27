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

type Gtag = (...args: unknown[]) => void;

// GA4 にイベントを送る。gtag が無い（開発環境・タグ未読み込み）ときは何もしない。
// 内部閲覧者・本番ドメイン以外は ga-disable で gtag 側が送信を止める。
// 個人を特定できる情報はパラメータに入れないこと。
export function track(event: string, params: Record<string, string | number | undefined> = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") {
    return;
  }

  gtag("event", event, params);
}

// 詳細ページ（/covers/[id] など）の既定の ui_location。
const DETAIL_UI_LOCATIONS: Record<string, string> = {
  covers: "cover_detail",
  performers: "performer_page",
  songs: "song_page",
  features: "feature_page",
  groups: "group_page"
};

// イベントの発生場所を、押された要素の祖先の data 属性から組み立てる。
// - data-ui-location: 棚やかごなど、同じページ内で場所を見分けたい区画に付ける。無ければパスから決める
// - data-item-id / data-content-type: リンク自体が対象 ID を持たない区画（詳細ページ・かごの行など）に付ける
export function trackingContext(element: Element | null) {
  const location = element?.closest<HTMLElement>("[data-ui-location]")?.dataset.uiLocation;
  const item = element?.closest<HTMLElement>("[data-item-id]");

  return {
    ui_location: location ?? defaultUiLocation(window.location.pathname),
    item_id: item?.dataset.itemId,
    content_type: item?.dataset.contentType
  };
}

function defaultUiLocation(pathname: string) {
  const [first, second] = pathname.split("/").filter(Boolean);

  if (!first) {
    return "home";
  }

  return (second && second !== "new" && DETAIL_UI_LOCATIONS[first]) || first;
}
