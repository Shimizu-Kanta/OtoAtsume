"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CoverCard } from "@/components/covers/cover-card";
import { CoverList } from "@/components/covers/cover-list";
import { CoverViewToggle, type CoverViewMode } from "@/components/covers/cover-view-toggle";
import type { CoverListItem } from "@/lib/data/covers";

const STORAGE_KEY = "coversViewMode";

function normalizeViewMode(value: string | null | undefined): CoverViewMode | null {
  return value === "card" || value === "list" ? value : null;
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

  try {
    return normalizeViewMode(window.localStorage.getItem(STORAGE_KEY)) ?? "card";
  } catch {
    return "card";
  }
}

export function CoverResults({
  covers,
  initialViewMode
}: {
  covers: CoverListItem[];
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
      router.replace(`${nextUrl.pathname}${nextUrl.search}`, { scroll: false });
    });
  }

  return (
    <div className="space-y-5" data-pending={isPending ? "true" : undefined}>
      <CoverViewToggle value={viewMode} totalCount={covers.length} onValueChange={handleViewChange} />

      {viewMode === "list" ? (
        <CoverList covers={covers} />
      ) : covers.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {covers.map((cover) => (
            <CoverCard key={cover.id} cover={cover} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-primary/10 bg-card/90 p-6 text-sm text-muted-foreground shadow-sm">
          条件に一致するカバー記録はありません。
        </div>
      )}
    </div>
  );
}
