"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/select";
import { coverTypeOptions, multiSongCoverTypes } from "@/lib/constants";

// 候補の確定フォームは1曲用のため、歌枠・ライブ・メドレー（1URL複数曲）が選ばれたら
// 複数曲を入力できる一括登録画面へ引き継ぐ。選択肢に出しておきながら1曲フォームのまま
// にすると「メドレーを選んでも複数曲入力にならない」状態になるため。
export function CandidateCoverTypeSelect({
  defaultValue,
  bulkHandoffQuery
}: {
  defaultValue: string;
  // sourceUrl・performedAt・performerIds を含む一括登録画面向けのクエリ（coverType は含めない）。
  bulkHandoffQuery: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const isMulti = multiSongCoverTypes.has(value);

  function handleChange(next: string) {
    setValue(next);

    if (multiSongCoverTypes.has(next)) {
      const params = new URLSearchParams(bulkHandoffQuery);
      params.set("coverType", next);
      router.push(`/admin/covers/bulk-new?${params.toString()}`);
    }
  }

  return (
    <>
      <Select
        id="coverType"
        name="coverType"
        required
        value={value}
        onChange={(event) => handleChange(event.target.value)}
      >
        {coverTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {isMulti ? (
        <p className="text-xs text-muted-foreground">複数曲を登録できる一括登録画面へ移動します…</p>
      ) : null}
    </>
  );
}
