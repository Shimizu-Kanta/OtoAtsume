export const coverTypeOptions = [
  { value: "COVER_VIDEO", label: "歌ってみた動画" },
  { value: "KARAOKE_STREAM", label: "歌枠" },
  { value: "LIVE_EVENT", label: "ライブ・イベント" },
  { value: "MEDLEY", label: "メドレー" },
  { value: "SHORT", label: "ショート" },
  { value: "OTHER", label: "その他" }
] as const;

// 1つのアーカイブURLに複数曲が含まれうる歌唱種別（曲ごとのタイムスタンプで複数曲を登録する）。
// 公開フォーム・管理画面フォームの両方で同じ判定を使うことで、UI切り替えロジックの二重実装を避ける。
export const multiSongCoverTypes = new Set<string>(["KARAOKE_STREAM", "LIVE_EVENT", "MEDLEY"]);

export const reportReasonOptions = [
  { value: "WRONG_SONG", label: "楽曲が違う" },
  { value: "WRONG_PERFORMER", label: "活動者が違う" },
  { value: "WRONG_DATE", label: "日付が違う" },
  { value: "BROKEN_URL", label: "URLが無効" },
  { value: "MEMBERS_ONLY_CONTENT", label: "メンバー限定情報" },
  { value: "NON_PUBLIC_PAID_CONTENT", label: "未公開の有料情報" },
  { value: "DUPLICATE", label: "重複候補" },
  { value: "OTHER", label: "その他" }
] as const;

export const contentStatusOptions = [
  { value: "PENDING", label: "確認待ち" },
  { value: "APPROVED", label: "公開" },
  { value: "REJECTED", label: "却下" },
  { value: "HIDDEN", label: "非表示" }
] as const;

export const reportStatusOptions = [
  { value: "PENDING", label: "未対応" },
  { value: "RESOLVED", label: "解決済み" },
  { value: "REJECTED", label: "却下" }
] as const;

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined
) {
  return options.find((option) => option.value === value)?.label ?? value ?? "-";
}

export function coverTypeLabel(value: string) {
  return labelFor(coverTypeOptions, value);
}

export function reportReasonLabel(value: string) {
  return labelFor(reportReasonOptions, value);
}

export function contentStatusLabel(value: string) {
  return labelFor(contentStatusOptions, value);
}

export function reportStatusLabel(value: string) {
  return labelFor(reportStatusOptions, value);
}
