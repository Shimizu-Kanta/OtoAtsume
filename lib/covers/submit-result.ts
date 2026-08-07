// 歌唱記録登録フォーム（公開 /covers/new・管理画面 /admin/covers/bulk-new）の
// server action が共通で返す結果の型。CoverRegistrationForm はこの型を見て
// 成功時の遷移・失敗時のエラー表示を行う。
export type CoverSubmitPreviewItem = {
  id: string;
  songTitle: string;
  timestampSeconds: number | null;
  performerNames: string[];
};

export type CoverSubmitResult =
  | {
      ok: true;
      coverIds: string[];
      // 「同じURLで記録を追加」に引き継ぐ、作成後の正規化済み sourceUrl。
      sourceUrl: string | null;
      preview: CoverSubmitPreviewItem[];
    }
  | { ok: false; error: string };
