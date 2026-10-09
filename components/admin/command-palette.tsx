"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Music, Search, User, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type CommandPalettePage = { href: string; label: string; icon: LucideIcon };

type SearchResponse = {
  performers: { id: string; name: string; sub: string }[];
  songs: { id: string; title: string; sub: string }[];
  features: { id: string; title: string }[];
};

type PaletteItem = {
  key: string;
  href: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
};

type PaletteGroup = { title: string; items: PaletteItem[] };

const GROUP_LIMIT = 5;
const DEBOUNCE_MS = 200;

// 管理画面の ⌘K 検索。ページ名はクライアント側で絞り、活動者・楽曲・特集は API に問い合わせる。
// 管理画面の外枠(AdminShell)の中にだけ置くので、公開サイトでは ⌘K に反応しない。
export function CommandPalette({ pages }: { pages: CommandPalettePage[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white/70 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden flex-1 text-left sm:inline">検索…</span>
        <span className="sr-only sm:hidden">検索</span>
        <kbd className="ml-auto hidden rounded border border-white/20 px-1.5 font-mono text-[11px] text-white/50 sm:inline">
          ⌘K
        </kbd>
      </button>
      {open ? <PaletteDialog pages={pages} onClose={close} /> : null}
    </>
  );
}

function PaletteDialog({ pages, onClose }: { pages: CommandPalettePage[]; onClose: () => void }) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // 結果は問い合わせたキーワードと組にして持ち、今の入力と一致するときだけ出す
  // (速く打ったときに古い結果が後から表示されないようにする)。
  const [remote, setRemote] = useState<{ query: string; data: SearchResponse } | null>(null);
  const [failed, setFailed] = useState(false);

  const trimmed = query.trim();

  useEffect(() => {
    inputRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    setFailed(false);

    if (!trimmed) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" }
        });
        if (!response.ok) {
          throw new Error(`search failed: ${response.status}`);
        }
        const data = (await response.json()) as SearchResponse;
        setRemote({ query: trimmed, data });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setFailed(true);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const loading = Boolean(trimmed) && remote?.query !== trimmed && !failed;

  const groups = useMemo<PaletteGroup[]>(() => {
    const keyword = trimmed.toLowerCase();
    const pageItems = pages
      .filter((page) => !keyword || page.label.toLowerCase().includes(keyword))
      .slice(0, keyword ? GROUP_LIMIT : pages.length)
      .map((page) => ({ key: `page:${page.href}`, href: page.href, label: page.label, icon: page.icon }));

    const result: PaletteGroup[] = [{ title: "ページ", items: pageItems }];
    const data = remote && remote.query === trimmed ? remote.data : null;

    if (trimmed && data) {
      result.push(
        {
          title: "活動者",
          items: data.performers.slice(0, GROUP_LIMIT).map((performer) => ({
            key: `performer:${performer.id}`,
            href: `/admin/performers/${performer.id}`,
            label: performer.name,
            sub: performer.sub || undefined,
            icon: User
          }))
        },
        {
          title: "楽曲",
          items: data.songs.slice(0, GROUP_LIMIT).map((song) => ({
            key: `song:${song.id}`,
            href: `/admin/songs/${song.id}`,
            label: song.title,
            sub: song.sub || undefined,
            icon: Music
          }))
        },
        {
          title: "特集",
          items: data.features.slice(0, GROUP_LIMIT).map((feature) => ({
            key: `feature:${feature.id}`,
            href: `/admin/features/${feature.id}/edit`,
            label: feature.title,
            icon: FileText
          }))
        }
      );
    }

    return result.filter((group) => group.items.length > 0);
  }, [pages, remote, trimmed]);

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  // 候補が入れ替わったら先頭を選び直す。
  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems]);

  // 選択中の項目が見えるようにスクロールする。
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flatItems]);

  function go(item: PaletteItem | undefined) {
    if (!item) {
      return;
    }
    onClose();
    router.push(item.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (flatItems.length === 0 ? 0 : (index + 1) % flatItems.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        flatItems.length === 0 ? 0 : (index - 1 + flatItems.length) % flatItems.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(flatItems[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  const activeItem = flatItems[activeIndex];
  const optionId = (key: string) => `${listboxId}-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 cursor-default bg-[#111827]/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="管理画面を検索"
        className="relative mx-auto mt-[12vh] flex max-h-[70vh] w-[calc(100%-2rem)] max-w-[640px] flex-col overflow-hidden rounded-lg border bg-card text-foreground shadow-modal"
      >
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeItem ? optionId(activeItem.key) : undefined}
            aria-label="ページ・活動者・楽曲・特集を検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ページ・活動者(別名可)・楽曲・特集を検索"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            maxLength={50}
            autoComplete="off"
            spellCheck={false}
          />
          {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
          <kbd className="hidden rounded border px-1.5 font-mono text-[11px] text-muted-foreground sm:inline">Esc</kbd>
        </div>

        <ul ref={listRef} id={listboxId} role="listbox" aria-label="検索結果" className="flex-1 overflow-y-auto p-2">
          {groups.map((group) => (
            <li key={group.title} role="presentation" className="mb-1 last:mb-0">
              <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" aria-hidden="true">
                {group.title}
              </p>
              <ul role="group" aria-label={group.title}>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const selected = index === activeIndex;
                  const Icon = item.icon;

                  return (
                    <li
                      key={item.key}
                      id={optionId(item.key)}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => {
                        if (!selected) setActiveIndex(index);
                      }}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => go(item)}
                      className={cn(
                        "flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm",
                        selected ? "bg-primary/10 text-primary" : "text-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
                      <span className="min-w-0 truncate font-medium">{item.label}</span>
                      {item.sub ? (
                        <span className="min-w-0 truncate text-xs text-muted-foreground">{item.sub}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}

          {flatItems.length === 0 && !loading ? (
            <li role="presentation" className="px-2 py-8 text-center text-sm text-muted-foreground">
              {failed ? "検索に失敗しました。時間をおいて再度お試しください。" : "見つかりませんでした"}
            </li>
          ) : null}
        </ul>

        <div className="flex items-center gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            <kbd className="font-mono">↑↓</kbd> 選択
          </span>
          <span>
            <kbd className="font-mono">Enter</kbd> 移動
          </span>
          <span>
            <kbd className="font-mono">⌘K</kbd> 開閉
          </span>
        </div>
      </div>
    </div>
  );
}
