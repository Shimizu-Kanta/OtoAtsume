"use client";

import { useState } from "react";
import { Plus, Shuffle, X } from "lucide-react";

import { ArtistPicker } from "@/components/artist-picker";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ランダムプレイリストの条件フォーム。送信は素の GET（/playlist）で、
// サーバ側で毎回抽選し直すので「もう一度シャッフル」も同じ送信で済む。
// アーティストは複数指定できるよう、選んだものをチップにして hidden input で送る。
export function PlaylistForm({
  count,
  dateFrom,
  dateTo,
  artists: initialArtists,
  allowDuplicateSongs,
  maxCount,
  maxArtists,
  submitLabel
}: {
  count: number;
  dateFrom?: string;
  dateTo?: string;
  artists: string[];
  allowDuplicateSongs: boolean;
  maxCount: number;
  maxArtists: number;
  submitLabel: string;
}) {
  const [artists, setArtists] = useState<string[]>(initialArtists);
  const [draft, setDraft] = useState("");

  const canAddArtist = artists.length < maxArtists;

  function addArtist() {
    const name = draft.trim();
    if (!name || !canAddArtist) {
      return;
    }
    if (!artists.some((artist) => artist.toLowerCase() === name.toLowerCase())) {
      setArtists([...artists, name]);
    }
    setDraft("");
  }

  return (
    <form
      action="/playlist"
      className="overflow-hidden rounded-[3px] border border-rule bg-panel shadow-lift"
      onKeyDown={(event) => {
        // アーティスト入力欄で Enter を押したときはフォーム送信ではなくチップ追加にする。
        if (event.key === "Enter" && (event.target as HTMLElement).id === "playlist-artist") {
          event.preventDefault();
          addArtist();
        }
      }}
    >
      <div className="bg-board px-4 py-2.5">
        <p className="eyebrow-board">shuffle / conditions</p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="tracks" htmlFor="playlist-count">
            <Input
              id="playlist-count"
              name="count"
              type="number"
              min={1}
              max={maxCount}
              defaultValue={count}
              required
            />
          </Field>
          <Field label="published from" htmlFor="playlist-from">
            <Input id="playlist-from" name="dateFrom" type="date" defaultValue={dateFrom} />
          </Field>
          <Field label="published to" htmlFor="playlist-to">
            <Input id="playlist-to" name="dateTo" type="date" defaultValue={dateTo} />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="playlist-artist" className="eyebrow-muted">
            original artists（最大{maxArtists}組・いずれかに一致）
          </label>
          {/* 追加したアーティストは hidden input で送る。入力途中の欄は name を持たせない。 */}
          {artists.map((artist) => (
            <input key={artist} type="hidden" name="artist" value={artist} />
          ))}
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <ArtistPicker
                id="playlist-artist"
                name=""
                value={draft}
                onChange={setDraft}
                placeholder={canAddArtist ? "原曲アーティスト名" : `最大${maxArtists}組までです`}
              />
            </div>
            <button
              type="button"
              onClick={addArtist}
              disabled={!draft.trim() || !canAddArtist}
              className={cn(buttonVariants({ variant: "secondary" }), "h-10 shrink-0 px-3")}
            >
              <Plus className="size-4" aria-hidden="true" />
              追加
            </button>
          </div>
          {artists.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {artists.map((artist) => (
                <li key={artist}>
                  <span className="inline-flex items-center gap-1 border border-board bg-board px-2.5 py-1 text-[11px] font-semibold text-board-ink">
                    {artist}
                    <button
                      type="button"
                      aria-label={`${artist}を条件から外す`}
                      onClick={() => setArtists(artists.filter((name) => name !== artist))}
                      className="rounded-[2px] hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-[color:var(--slate-light)]">
              指定しなければ、すべてのアーティストが対象です。
            </p>
          )}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            name="dup"
            value="1"
            defaultChecked={allowDuplicateSongs}
            className="size-4 accent-[color:var(--stamp)]"
          />
          同じ曲の別の歌唱を重複して入れてもよい
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={cn(buttonVariants(), "h-[42px] px-6")}>
            <Shuffle className="size-4" aria-hidden="true" />
            {submitLabel}
          </button>
          <a
            href="/playlist"
            className="text-[13px] text-slate underline-offset-4 hover:text-ink hover:underline"
          >
            条件をクリア
          </a>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={htmlFor} className="eyebrow-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
