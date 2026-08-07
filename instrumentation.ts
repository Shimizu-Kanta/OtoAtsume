// Node.js プロセスが未処理の例外・Promise rejection でクラッシュする直前に、
// 最低限エラー内容を標準エラー出力（Cloud Logging に拾われる）へ書き出す。
//
// 経緯: 2026年、管理画面の歌唱記録編集で特定の入力によりサーバーが503を返す
// 障害が発生したが、Cloud Logging には severity>=ERROR のログが一切残らず、
// Error Reporting にも記録されなかった。これは、例外がアプリケーションコードの
// catch で捕捉される前に Node.js プロセスごと異常終了し、ログをフラッシュする
// 前にインスタンスが落ちていたためと考えられる。本ファイルは、そうした
// プロセスクラッシュが今後発生した際に、原因調査の手がかりを最低限
// ログに残すための保険であり、根本原因そのものの対策ではない
// （根本原因は Task「歌唱記録編集画面 503エラー調査・修正」で別途対応済み）。
export async function register() {
  // instrumentation.ts の register() は Node.js ランタイムと Edge ランタイムの
  // 両方で呼ばれるが、process.on はいずれも Node.js ランタイムでのみ有効。
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("uncaughtException", (error) => {
      console.error("[uncaughtException]", error);
    });

    process.on("unhandledRejection", (reason) => {
      console.error("[unhandledRejection]", reason);
    });
  }
}
