"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, GripVertical, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { normalizeSlug, type FeatureLink } from "@/lib/validations/feature";
import { saveFeatureAction, type FeatureFormState } from "./actions";

export type FeatureFormItem = {
  coverId: string;
  songTitle: string;
  performerNames: string;
  artistNames: string;
  performedAt: string;
  comment: string;
};

type CoverSearchResult = {
  id: string;
  songTitle: string;
  artistNames: string;
  performerNames: string;
  performedAt: string;
};

export type FeatureFormDefaults = {
  title: string;
  slug: string;
  lead: string;
  outro: string;
  items: FeatureFormItem[];
  links: FeatureLink[];
};

const EMPTY_LINK: FeatureLink = { url: "", label: "", note: undefined };

export function FeatureForm({
  featureId,
  defaults
}: {
  featureId: string | null;
  defaults: FeatureFormDefaults;
}) {
  const [state, formAction, pending] = useActionState<FeatureFormState, FormData>(
    saveFeatureAction.bind(null, featureId),
    {}
  );

  const [title, setTitle] = useState(defaults.title);
  const [slug, setSlug] = useState(defaults.slug);
  const [items, setItems] = useState<FeatureFormItem[]>(defaults.items);
  const [links, setLinks] = useState<Array<{ url: string; label: string; note: string }>>(
    defaults.links.map((link) => ({ url: link.url, label: link.label, note: link.note ?? "" }))
  );

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= items.length) {
      return;
    }
    setItems((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function addCover(result: CoverSearchResult) {
    setItems((current) => {
      if (current.some((item) => item.coverId === result.id)) {
        return current;
      }
      return [
        ...current,
        {
          coverId: result.id,
          songTitle: result.songTitle,
          performerNames: result.performerNames,
          artistNames: result.artistNames,
          performedAt: result.performedAt,
          comment: ""
        }
      ];
    });
  }

  // items / links は動的なので JSON にまとめて hidden で送る。position は保存側で採番する。
  const itemsJson = JSON.stringify(
    items.map((item) => ({ coverId: item.coverId, comment: item.comment }))
  );
  const linksJson = JSON.stringify(
    links
      .map((link) => ({
        url: link.url.trim(),
        label: link.label.trim(),
        note: link.note.trim() ? link.note.trim() : undefined
      }))
      .filter((link) => link.url.length > 0 || link.label.length > 0)
  );

  const selectedCoverIds = new Set(items.map((item) => item.coverId));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="itemsJson" value={itemsJson} readOnly />
      <input type="hidden" name="linksJson" value={linksJson} readOnly />

      {state.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {state.error}
        </div>
      ) : null}

      <div className="space-y-4 rounded-md border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="title">タイトル</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">slug（URL・英数字とハイフン）</Label>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            onBlur={() => setSlug((current) => normalizeSlug(current))}
            placeholder="women-sing-hoshino-gen"
            required
          />
          <p className="text-xs text-muted-foreground">
            公開URL: <span className="font-mono">/features/{normalizeSlug(slug) || "…"}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead">序文</Label>
          <Textarea id="lead" name="lead" defaultValue={defaults.lead} className="min-h-36" required />
        </div>
      </div>

      <CoverPickerSection items={items} onAdd={addCover} onMove={moveItem} onRemove={(coverId) =>
        setItems((current) => current.filter((item) => item.coverId !== coverId))
      } onComment={(coverId, comment) =>
        setItems((current) =>
          current.map((item) => (item.coverId === coverId ? { ...item, comment } : item))
        )
      } selectedCoverIds={selectedCoverIds} />

      <div className="space-y-2 rounded-md border bg-card p-5">
        <Label htmlFor="outro">結び（任意）</Label>
        <Textarea id="outro" name="outro" defaultValue={defaults.outro} className="min-h-28" />
      </div>

      <LinksSection links={links} setLinks={setLinks} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : featureId ? "下書きを保存" : "下書きとして作成"}
        </Button>
        <Link href="/admin/features" className="rounded-md border px-4 py-2 text-sm">
          一覧に戻る
        </Link>
      </div>
    </form>
  );
}

function CoverPickerSection({
  items,
  selectedCoverIds,
  onAdd,
  onMove,
  onRemove,
  onComment
}: {
  items: FeatureFormItem[];
  selectedCoverIds: Set<string>;
  onAdd: (result: CoverSearchResult) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (coverId: string) => void;
  onComment: (coverId: string, comment: string) => void;
}) {
  const dragIndex = useRef<number | null>(null);

  return (
    <div className="space-y-4 rounded-md border bg-card p-5">
      <div>
        <h2 className="text-base font-bold">曲リスト</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          楽曲名・活動者名で検索して追加します。同じ曲の別歌唱を取り違えないよう、歌唱者名と配信日で選んでください。ドラッグまたは上下ボタンで並び替えられます。
        </p>
      </div>

      <CoverSearchBox onAdd={onAdd} selectedCoverIds={selectedCoverIds} />

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          まだ曲が追加されていません。上の検索から追加してください。
        </p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.coverId}
              draggable
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex.current !== null) {
                  onMove(dragIndex.current, index);
                  dragIndex.current = null;
                }
              }}
              className="rounded-md border bg-background p-3"
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 shrink-0 cursor-grab text-muted-foreground"
                  aria-hidden="true"
                >
                  <GripVertical className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="truncate text-sm font-bold text-foreground">{item.songTitle}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[item.performerNames, item.artistNames, item.performedAt]
                      .filter(Boolean)
                      .join(" ／ ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    label="上へ"
                    onClick={() => onMove(index, index - 1)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="size-4" />
                  </IconButton>
                  <IconButton
                    label="下へ"
                    onClick={() => onMove(index, index + 1)}
                    disabled={index === items.length - 1}
                  >
                    <ChevronDown className="size-4" />
                  </IconButton>
                  <IconButton label="この曲を外す" onClick={() => onRemove(item.coverId)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
              <Textarea
                aria-label={`${item.songTitle} のコメント`}
                value={item.comment}
                onChange={(event) => onComment(item.coverId, event.target.value)}
                placeholder="この歌唱について書く"
                className="mt-3 min-h-24"
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CoverSearchBox({
  onAdd,
  selectedCoverIds
}: {
  onAdd: (result: CoverSearchResult) => void;
  selectedCoverIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoverSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (timer.current) {
      clearTimeout(timer.current);
    }

    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/features/search-covers?q=${encodeURIComponent(trimmed)}`
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = (await response.json()) as { covers: CoverSearchResult[] };
        setResults(data.covers);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="楽曲名・活動者名で検索"
          className="pl-9"
          aria-label="歌唱記録を検索"
        />
      </div>

      {query.trim().length > 0 ? (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-md border">
          {loading && results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">検索中…</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">該当する歌唱記録がありません。</p>
          ) : (
            <ul className="divide-y">
              {results.map((result) => {
                const added = selectedCoverIds.has(result.id);
                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => onAdd(result)}
                      disabled={added}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      <span className="text-sm font-bold text-foreground">{result.songTitle}</span>
                      <span className="text-xs text-muted-foreground">
                        {[result.performerNames, result.artistNames, result.performedAt]
                          .filter(Boolean)
                          .join(" ／ ")}
                        {added ? "（追加済み）" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LinksSection({
  links,
  setLinks
}: {
  links: Array<{ url: string; label: string; note: string }>;
  setLinks: React.Dispatch<React.SetStateAction<Array<{ url: string; label: string; note: string }>>>;
}) {
  function update(index: number, key: "url" | "label" | "note", value: string) {
    setLinks((current) => current.map((link, i) => (i === index ? { ...link, [key]: value } : link)));
  }

  return (
    <div className="space-y-3 rounded-md border bg-card p-5">
      <div>
        <h2 className="text-base font-bold">関連リンク（任意）</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          記事末尾に置くリンクです。記事内で紹介した曲以外の導線に使います。サイト内リンク（/ 始まり）と https:// のみ登録できます。
        </p>
      </div>

      {links.length > 0 ? (
        <ul className="space-y-3">
          {links.map((link, index) => (
            <li key={index} className="rounded-md border bg-background p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`link-url-${index}`} className="text-xs">
                    URL
                  </Label>
                  <Input
                    id={`link-url-${index}`}
                    value={link.url}
                    onChange={(event) => update(index, "url", event.target.value)}
                    placeholder="/covers?artist=星野源 または https://…"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`link-label-${index}`} className="text-xs">
                    ラベル
                  </Label>
                  <Input
                    id={`link-label-${index}`}
                    value={link.label}
                    onChange={(event) => update(index, "label", event.target.value)}
                    placeholder="星野源の他のカバーを探す"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor={`link-note-${index}`} className="text-xs">
                    補足（任意）
                  </Label>
                  <Input
                    id={`link-note-${index}`}
                    value={link.note}
                    onChange={(event) => update(index, "note", event.target.value)}
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLinks((current) => current.filter((_, i) => i !== index))}
                >
                  <X className="size-4" aria-hidden="true" />
                  この行を削除
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setLinks((current) => [...current, { ...EMPTY_LINK, note: "" }])}
      >
        <Plus className="size-4" aria-hidden="true" />
        リンクを追加
      </Button>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
