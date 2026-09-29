import { db } from "@/lib/db";

// 管理画面からのデータ書き出し（CSV / JSON）。
// 列名は一括インポート（lib/imports/master-data.ts）と揃えているため、書き出したファイルを
// 編集してそのままインポートに戻せる（id 等インポートが読まない列は無視される）。
// CSV の複数値（アーティスト・タグ等）はインポートと同じく ";" 区切り、JSON では配列で出力する。
// ipHash / userAgentHash などの識別情報は書き出さない。

export const exportTargets = [
  "songs",
  "artists",
  "performers",
  "groups",
  "tags",
  "tagGroups",
  "covers",
  "crawlKeywords"
] as const;
export type ExportTarget = (typeof exportTargets)[number];

export const exportFormats = ["csv", "json"] as const;
export type ExportFormat = (typeof exportFormats)[number];

// 楽曲の原曲URLで絞り込む（原曲URL未設定の曲だけを AI に渡して URL を探させる用途など）。
export const songOriginalUrlFilters = ["all", "missing", "present"] as const;
export type SongOriginalUrlFilter = (typeof songOriginalUrlFilters)[number];

export const exportTargetLabels: Record<ExportTarget, string> = {
  songs: "楽曲（原曲）",
  artists: "アーティスト",
  performers: "活動者",
  groups: "所属グループ",
  tags: "タグ",
  tagGroups: "タググループ",
  covers: "歌唱記録",
  crawlKeywords: "巡回キーワード"
};

export type ExportOptions = {
  songOriginalUrl?: SongOriginalUrlFilter;
};

type ExportValue = string | number | boolean | null | string[];
type ExportRow = Record<string, ExportValue>;

export type ExportTable = {
  columns: string[];
  rows: ExportRow[];
};

export function isExportTarget(value: unknown): value is ExportTarget {
  return typeof value === "string" && (exportTargets as readonly string[]).includes(value);
}

export function isExportFormat(value: unknown): value is ExportFormat {
  return typeof value === "string" && (exportFormats as readonly string[]).includes(value);
}

export function isSongOriginalUrlFilter(value: unknown): value is SongOriginalUrlFilter {
  return typeof value === "string" && (songOriginalUrlFilters as readonly string[]).includes(value);
}

export async function buildExportTable(target: ExportTarget, options: ExportOptions = {}): Promise<ExportTable> {
  switch (target) {
    case "songs":
      return exportSongs(options.songOriginalUrl ?? "all");
    case "artists":
      return exportArtists();
    case "performers":
      return exportPerformers();
    case "groups":
      return exportGroups();
    case "tags":
      return exportTags();
    case "tagGroups":
      return exportTagGroups();
    case "covers":
      return exportCovers();
    case "crawlKeywords":
      return exportCrawlKeywords();
  }
}

export function serializeExport(table: ExportTable, format: ExportFormat): string {
  if (format === "json") {
    return JSON.stringify(table.rows, null, 2);
  }

  const lines = [table.columns, ...table.rows.map((row) => table.columns.map((column) => row[column] ?? null))];
  // Excel で開いたときに文字化けしないよう UTF-8 BOM を付ける。
  return `﻿${lines.map((cells) => cells.map(toCsvCell).join(",")).join("\r\n")}\r\n`;
}

function toCsvCell(value: ExportValue): string {
  if (value == null) {
    return "";
  }

  const text = Array.isArray(value) ? value.join(";") : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toDateString(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toDateTimeString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function exportSongs(filter: SongOriginalUrlFilter): Promise<ExportTable> {
  const songs = await db.song.findMany({
    where:
      filter === "missing"
        ? { OR: [{ originalUrl: null }, { originalUrl: "" }] }
        : filter === "present"
          ? { AND: [{ originalUrl: { not: null } }, { originalUrl: { not: "" } }] }
          : undefined,
    orderBy: [{ title: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      originalUrl: true,
      createdAt: true,
      updatedAt: true,
      artists: { select: { artist: { select: { name: true } } } },
      _count: { select: { covers: true } }
    }
  });

  return {
    columns: ["id", "title", "artists", "originalUrl", "coverCount", "createdAt", "updatedAt"],
    rows: songs.map((song) => ({
      id: song.id,
      title: song.title,
      artists: song.artists.map(({ artist }) => artist.name).sort((a, b) => a.localeCompare(b, "ja")),
      originalUrl: song.originalUrl || null,
      coverCount: song._count.covers,
      createdAt: toDateTimeString(song.createdAt),
      updatedAt: toDateTimeString(song.updatedAt)
    }))
  };
}

async function exportArtists(): Promise<ExportTable> {
  const artists = await db.artist.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, createdAt: true, _count: { select: { songs: true } } }
  });

  return {
    columns: ["id", "name", "songCount", "createdAt"],
    rows: artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      songCount: artist._count.songs,
      createdAt: toDateTimeString(artist.createdAt)
    }))
  };
}

async function exportPerformers(): Promise<ExportTable> {
  const performers = await db.performer.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      youtubeUrl: true,
      officialUrl: true,
      colorCode: true,
      debutDate: true,
      birthday: true,
      status: true,
      youtubeChannelId: true,
      crawlEnabled: true,
      createdAt: true,
      updatedAt: true,
      group: { select: { name: true } },
      aliases: { select: { alias: true }, orderBy: { alias: "asc" } },
      tags: { select: { tag: { select: { name: true } } } },
      _count: { select: { covers: true } }
    }
  });

  return {
    columns: [
      "id",
      "name",
      "group",
      "aliases",
      "tags",
      "youtubeUrl",
      "officialUrl",
      "colorCode",
      "debutDate",
      "birthday",
      "status",
      "youtubeChannelId",
      "crawlEnabled",
      "coverCount",
      "createdAt",
      "updatedAt"
    ],
    rows: performers.map((performer) => ({
      id: performer.id,
      name: performer.name,
      group: performer.group?.name ?? null,
      aliases: performer.aliases.map(({ alias }) => alias),
      tags: performer.tags.map(({ tag }) => tag.name).sort((a, b) => a.localeCompare(b, "ja")),
      youtubeUrl: performer.youtubeUrl,
      officialUrl: performer.officialUrl,
      colorCode: performer.colorCode,
      debutDate: toDateString(performer.debutDate),
      birthday: toDateString(performer.birthday),
      status: performer.status,
      youtubeChannelId: performer.youtubeChannelId,
      crawlEnabled: performer.crawlEnabled,
      coverCount: performer._count.covers,
      createdAt: toDateTimeString(performer.createdAt),
      updatedAt: toDateTimeString(performer.updatedAt)
    }))
  };
}

async function exportGroups(): Promise<ExportTable> {
  const groups = await db.group.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, createdAt: true, _count: { select: { performers: true } } }
  });

  return {
    columns: ["id", "name", "performerCount", "createdAt"],
    rows: groups.map((group) => ({
      id: group.id,
      name: group.name,
      performerCount: group._count.performers,
      createdAt: toDateTimeString(group.createdAt)
    }))
  };
}

async function exportTags(): Promise<ExportTable> {
  const tags = await db.tag.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      createdAt: true,
      groups: { select: { tagGroup: { select: { name: true } } } },
      _count: { select: { performers: true } }
    }
  });

  return {
    columns: ["id", "name", "tagGroups", "performerCount", "createdAt"],
    rows: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      tagGroups: tag.groups.map(({ tagGroup }) => tagGroup.name).sort((a, b) => a.localeCompare(b, "ja")),
      performerCount: tag._count.performers,
      createdAt: toDateTimeString(tag.createdAt)
    }))
  };
}

async function exportTagGroups(): Promise<ExportTable> {
  const tagGroups = await db.tagGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      createdAt: true,
      tags: { select: { tag: { select: { name: true } } } }
    }
  });

  return {
    columns: ["id", "name", "sortOrder", "tags", "createdAt"],
    rows: tagGroups.map((tagGroup) => ({
      id: tagGroup.id,
      name: tagGroup.name,
      sortOrder: tagGroup.sortOrder,
      tags: tagGroup.tags.map(({ tag }) => tag.name).sort((a, b) => a.localeCompare(b, "ja")),
      createdAt: toDateTimeString(tagGroup.createdAt)
    }))
  };
}

async function exportCovers(): Promise<ExportTable> {
  const covers = await db.cover.findMany({
    orderBy: [{ performedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      performedAt: true,
      coverType: true,
      sourceUrl: true,
      sourceVideoId: true,
      sourceTitle: true,
      timestampSeconds: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      song: {
        select: {
          id: true,
          title: true,
          artists: { select: { artist: { select: { name: true } } } }
        }
      },
      performers: { select: { performer: { select: { name: true } } } }
    }
  });

  return {
    columns: [
      "id",
      "songId",
      "songTitle",
      "artists",
      "performers",
      "performedAt",
      "coverType",
      "sourceUrl",
      "sourceVideoId",
      "sourceTitle",
      "timestampSeconds",
      "status",
      "createdAt",
      "updatedAt"
    ],
    rows: covers.map((cover) => ({
      id: cover.id,
      songId: cover.song.id,
      songTitle: cover.song.title,
      artists: cover.song.artists.map(({ artist }) => artist.name).sort((a, b) => a.localeCompare(b, "ja")),
      performers: cover.performers.map(({ performer }) => performer.name),
      performedAt: toDateTimeString(cover.performedAt),
      coverType: cover.coverType,
      sourceUrl: cover.sourceUrl,
      sourceVideoId: cover.sourceVideoId,
      sourceTitle: cover.sourceTitle,
      timestampSeconds: cover.timestampSeconds,
      status: cover.status,
      createdAt: toDateTimeString(cover.createdAt),
      updatedAt: toDateTimeString(cover.updatedAt)
    }))
  };
}

async function exportCrawlKeywords(): Promise<ExportTable> {
  const keywords = await db.crawlKeyword.findMany({
    orderBy: [{ kind: "asc" }, { keyword: "asc" }]
  });

  return {
    columns: ["id", "keyword", "kind", "enabled", "createdAt"],
    rows: keywords.map((keyword) => ({
      id: keyword.id,
      keyword: keyword.keyword,
      kind: keyword.kind,
      enabled: keyword.enabled,
      createdAt: toDateTimeString(keyword.createdAt)
    }))
  };
}
