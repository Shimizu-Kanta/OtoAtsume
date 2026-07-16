"use client";

import { useState } from "react";
import Image from "next/image";

import { CoverTypeFallbackIcon } from "@/lib/cover-type-icons";
import { isOptimizableImageUrl } from "@/lib/utils";
import type { CoverType } from "@prisma/client";

// サムネイル画像の表示と、URL未設定・読み込み失敗時の
// 歌唱種別ごとのフォールバックアイコン表示をまとめたコンポーネント。
// 親要素は position: relative かつ縦横比が確定している必要がある（Image fill 前提）。
export function CoverThumbnail({
  src,
  alt,
  coverType,
  sizes,
  priority = false,
  imageClassName,
  iconClassName
}: {
  src: string | null;
  alt: string;
  coverType: CoverType;
  sizes?: string;
  priority?: boolean;
  imageClassName?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <CoverTypeFallbackIcon coverType={coverType} className={iconClassName ?? "size-9"} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizableImageUrl(src)}
      className={imageClassName}
      onError={() => setFailed(true)}
    />
  );
}
