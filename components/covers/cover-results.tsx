"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CoverAlbumCard } from "@/components/covers/cover-album-card";
import { CoverList } from "@/components/covers/cover-list";
import { CoverViewToggle, type CoverViewMode } from "@/components/covers/cover-view-toggle";
import type { CoverAlbum, CoverListItem } from "@/lib/data/covers";

const STORAGE_KEY = "oa_view_mode";
// 旧キー。既存ユーザーの設定を失わないよう読み取り時のみフォールバックする。
// 書き込みは新キーのみで、旧キーの削除は次のリリースで行う。
const LEGACY_STORAGE_KEY = "coversViewMode";

function normalizeViewMode(value: string | null | undefined): CoverViewMode | null {
  return value === "card" || value === "list" ? value : null;
}

function readStoredViewMode(): CoverViewMode | null {
  try {
    return (
      normalizeViewMode(window.localStorage.getItem(STORAGE_KEY)) ??
      normalizeViewMode(window.localStorage.getItem(LEGACY_STORAGE_KEY))
    );
  } catch {
    return null;
  }
}

function resolveInitialViewMode(initialViewMode: string | null | undefined): CoverViewMode {
  if (typeof window === "undefined") {
    return normalizeViewMode(initialViewMode) ?? "card";
  }

  const currentParams = new URLSearchParams(window.location.search);
  const urlViewMode = currentParams.get("view");

  if (urlViewMode !== null) {
    return normalizeViewMode(urlViewMode) ?? "card";
  }

  return readStoredViewMode() ?? "card";
}

export function CoverResults({
  covers,
  albums,
  totalCount,
  albumCount,
  initialViewMode
}: {
  covers: CoverListItem[];
  albums: CoverAlbum[];
  totalCount?: number;
  albumCount?: number;
  initialViewMode?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<CoverViewMode>(() =>
    normalizeViewMode(initialViewMode) ?? "card"
  );

  useEffect(() => {
    setViewMode(resolveInitialViewMode(initialViewMode));
  }, [initialViewMode]);

  function handleViewChange(nextViewMode: CoverViewMode) {
    setViewMode(nextViewMode);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextViewMode);
    } catch {
      // localStorage が使えない環境では URL クエリのみで表示形式を保持します。
    }

    startTransition(() => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("view", nextViewMode);
      // カードはアルバム単位、リストは曲単位でページングするためページ数の意味が変わる。
      // 切り替え時は1ページ目に戻す。
      nextUrl.searchParams.delete("page");
      router.replace(`${nextUrl.pathname}${nextUrl.search}`, { scroll: false });
    });
  }

  return (
    <div className="space-y-5" data-pending={isPending ? "true" : undefined}>
      <CoverViewToggle
        value={viewMode}
        totalCount={totalCount ?? covers.length}
        albumCount={albumCount ?? albums.length}
        onValueChange={handleViewChange}
      />

      {viewMode === "list" ? (
        <CoverList covers={covers} />
      ) : albums.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {albums.map((album) => (
            <CoverAlbumCard key={album.key} album={album} />
          ))}
        </div>
      ) : (
        <div className="rounded-[4px] border border-rule bg-panel p-6 text-sm text-slate">
          条件に一致する歌唱記録はありません。
        </div>
      )}
    </div>
  );
}
