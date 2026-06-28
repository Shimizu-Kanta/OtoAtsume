import { createHash } from "crypto";

import { MasterDataStatus, Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { addPerformerTags } from "@/lib/data/tags";
import {
  importFormats,
  importTargets,
  maxImportRows,
  type ImportActionState,
  type ImportExecutionResult,
  type ImportFormat,
  type ImportInput,
  type ImportRowPreview,
  type ImportSummary,
  type ImportTarget
} from "@/lib/imports/types";
import { colorCodeSchema, debutDateSchema, birthdaySchema } from "@/lib/validations/performer-profile";

type RawImportRow = {
  rowNumber: number;
  value: Record<string, unknown>;
};

type PerformerImportRow = {
  rowNumber: number;
  name: string;
  groupName?: string;
  youtubeUrl?: string;
  officialUrl?: string;
  colorCode?: string;
  debutDate?: Date;
  birthday?: Date;
  tags: string[];
  aliases: string[];
  status: MasterDataStatus;
};

type GroupImportRow = {
  rowNumber: number;
  name: string;
};

type ArtistImportRow = {
  rowNumber: number;
  name: string;
};

type SongImportRow = {
  rowNumber: number;
  title: string;
  artistNames: string[];
  originalUrl?: string;
};

type NormalizedRows =
  | { target: "performers"; rows: PerformerImportRow[] }
  | { target: "groups"; rows: GroupImportRow[] }
  | { target: "artists"; rows: ArtistImportRow[] }
  | { target: "songs"; rows: SongImportRow[] };

type ValidationResult = {
  totalRows: number;
  normalized: NormalizedRows;
  errors: ImportRowPreview[];
};

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const defaultInput: ImportInput = {
  target: "performers",
  format: "json",
  content: ""
};

const textSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1, "必須です。").max(200, "200文字以内で入力してください。")
);

const optionalTextSchema = z.preprocess((value) => optionalString(value), z.string().max(2000).optional());

const optionalUrlSchema = z.preprocess(
  (value) => normalizeUrl(value),
  z.string().max(2000, "2000文字以内で入力してください。").url("URLの形式が正しくありません。").optional()
);

const statusSchema = z
  .preprocess((value) => {
    const text = optionalString(value);
    return text ? text.toUpperCase() : undefined;
  }, z.nativeEnum(MasterDataStatus).optional())
  .transform((value) => value ?? MasterDataStatus.APPROVED);

const performerSchema = z.object({
  rowNumber: z.number(),
  name: textSchema,
  groupName: optionalTextSchema,
  youtubeUrl: optionalUrlSchema,
  officialUrl: optionalUrlSchema,
  colorCode: colorCodeSchema,
  debutDate: debutDateSchema,
  birthday: birthdaySchema,
  tags: z.array(z.string().max(80, "タグ名は80文字以内で入力してください。")).default([]),
  aliases: z.array(textSchema).default([]),
  status: statusSchema
});

const groupSchema = z.object({
  rowNumber: z.number(),
  name: textSchema
});

const artistSchema = z.object({
  rowNumber: z.number(),
  name: textSchema
});

const songSchema = z.object({
  rowNumber: z.number(),
  title: textSchema,
  artistNames: z.array(textSchema).min(1, "artists は1件以上必要です。"),
  originalUrl: optionalUrlSchema
});

export function getInitialImportState(): ImportActionState {
  return {
    status: "idle",
    input: defaultInput,
    rows: []
  };
}

export function coerceImportInput(formData: FormData): ImportInput {
  const target = formData.get("target");
  const format = formData.get("format");
  const content = formData.get("content");

  return {
    target: isImportTarget(target) ? target : defaultInput.target,
    format: isImportFormat(format) ? format : defaultInput.format,
    content: typeof content === "string" ? content : ""
  };
}

export function createImportPreviewKey(input: ImportInput) {
  return createHash("sha256")
    .update(`${input.target}\0${input.format}\0${input.content}`)
    .digest("hex");
}

export async function previewMasterImport(input: ImportInput): Promise<ImportActionState> {
  const validation = validateImportInput(input);
  const plannedRows =
    validation.errors.length > 0 ? [] : await buildRowPreview(validation.normalized);
  const rows = [...validation.errors, ...plannedRows].sort(comparePreviewRows);
  const summary = summarizeRows(validation.totalRows, rows);

  return {
    status: summary.errorCount > 0 ? "error" : "preview",
    message:
      summary.errorCount > 0
        ? "不正な行があります。修正してから再度プレビューしてください。"
        : "プレビューを作成しました。",
    input,
    previewKey: createImportPreviewKey(input),
    summary,
    rows
  };
}

export async function executeMasterImport(input: ImportInput): Promise<ImportActionState> {
  const validation = validateImportInput(input);
  const plannedRows =
    validation.errors.length > 0 ? [] : await buildRowPreview(validation.normalized);
  const rows = [...validation.errors, ...plannedRows].sort(comparePreviewRows);
  const summary = summarizeRows(validation.totalRows, rows);

  if (summary.errorCount > 0) {
    return {
      status: "error",
      message: "不正な行があるためインポートを実行できません。",
      input,
      previewKey: createImportPreviewKey(input),
      summary,
      rows
    };
  }

  try {
    const result = await db.$transaction(async (client) =>
      executeValidatedRows(client, validation.normalized)
    );

    return {
      status: "imported",
      message: "インポートを実行しました。",
      input,
      previewKey: createImportPreviewKey(input),
      summary,
      rows,
      result
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "インポートに失敗しました。";
    const failedRow: ImportRowPreview = {
      rowNumber: 0,
      name: "実行エラー",
      action: "error",
      errors: [message]
    };

    return {
      status: "error",
      message: "インポート処理中にエラーが発生したため、変更は反映されていません。",
      input,
      previewKey: createImportPreviewKey(input),
      summary: summarizeRows(validation.totalRows, [failedRow]),
      rows: [failedRow],
      result: {
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: validation.totalRows,
        names: [],
        errors: [failedRow]
      }
    };
  }
}

function validateImportInput(input: ImportInput): ValidationResult {
  const parsed = parseRawRows(input);

  if (parsed.errors.length > 0) {
    return {
      totalRows: parsed.totalRows,
      normalized: emptyNormalizedRows(input.target),
      errors: parsed.errors
    };
  }

  const normalized = normalizeRows(input.target, input.format, parsed.rows);
  return {
    totalRows: parsed.totalRows,
    normalized: normalized.normalized,
    errors: normalized.errors
  };
}

function parseRawRows(input: ImportInput): {
  rows: RawImportRow[];
  totalRows: number;
  errors: ImportRowPreview[];
} {
  if (!input.content.trim()) {
    return {
      rows: [],
      totalRows: 0,
      errors: [rowError(0, "入力", "インポート内容を入力してください。")]
    };
  }

  if (input.format === "json") {
    try {
      const parsed = JSON.parse(input.content) as unknown;
      if (!Array.isArray(parsed)) {
        return {
          rows: [],
          totalRows: 0,
          errors: [rowError(0, "JSON", "JSON は配列形式のみ受け付けます。")]
        };
      }

      if (parsed.length > maxImportRows) {
        return {
          rows: [],
          totalRows: parsed.length,
          errors: [rowError(0, "JSON", `1回のインポートは最大 ${maxImportRows} 件です。`)]
        };
      }

      const rows: RawImportRow[] = [];
      const errors: ImportRowPreview[] = [];
      parsed.forEach((value, index) => {
        const rowNumber = index + 1;
        if (!isRecord(value)) {
          errors.push(rowError(rowNumber, `row ${rowNumber}`, "各行は object で指定してください。"));
          return;
        }
        rows.push({ rowNumber, value });
      });

      return { rows, totalRows: parsed.length, errors };
    } catch (error) {
      return {
        rows: [],
        totalRows: 0,
        errors: [
          rowError(
            0,
            "JSON",
            error instanceof Error ? `JSON の解析に失敗しました: ${error.message}` : "JSON の解析に失敗しました。"
          )
        ]
      };
    }
  }

  const parsedCsv = parseCsv(input.content);
  if (parsedCsv.error) {
    return {
      rows: [],
      totalRows: 0,
      errors: [rowError(parsedCsv.error.rowNumber, "CSV", parsedCsv.error.message)]
    };
  }

  const table = parsedCsv.rows;
  if (table.length === 0) {
    return {
      rows: [],
      totalRows: 0,
      errors: [rowError(0, "CSV", "CSV ヘッダーを入力してください。")]
    };
  }

  const headers = table[0].map((header) => header.trim());
  if (headers.every((header) => !header)) {
    return {
      rows: [],
      totalRows: 0,
      errors: [rowError(1, "CSV", "CSV ヘッダーを入力してください。")]
    };
  }

  const duplicatedHeaders = findDuplicates(headers.filter(Boolean).map((header) => header.toLowerCase()));
  if (duplicatedHeaders.length > 0) {
    return {
      rows: [],
      totalRows: 0,
      errors: [rowError(1, "CSV", `CSV ヘッダーが重複しています: ${duplicatedHeaders.join(", ")}`)]
    };
  }

  const dataRows = table
    .slice(1)
    .map((cells, index) => ({ cells, rowNumber: index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim()));

  if (dataRows.length > maxImportRows) {
    return {
      rows: [],
      totalRows: dataRows.length,
      errors: [rowError(0, "CSV", `1回のインポートは最大 ${maxImportRows} 件です。`)]
    };
  }

  return {
    rows: dataRows.map(({ cells, rowNumber }) => ({
      rowNumber,
      value: headers.reduce<Record<string, unknown>>((record, header, index) => {
        if (header) {
          record[header] = cells[index] ?? "";
        }
        return record;
      }, {})
    })),
    totalRows: dataRows.length,
    errors: []
  };
}

function normalizeRows(
  target: ImportTarget,
  format: ImportFormat,
  rows: RawImportRow[]
): { normalized: NormalizedRows; errors: ImportRowPreview[] } {
  const errors: ImportRowPreview[] = [];

  if (target === "performers") {
    const normalizedRows = rows
      .map((row) => normalizePerformerRow(row, format))
      .filter((result): result is { row: PerformerImportRow } => {
        if ("error" in result) {
          errors.push(result.error);
          return false;
        }
        return true;
      })
      .map(({ row }) => row);
    const deduped = removeDuplicateRows(normalizedRows, (row) => row.name.toLowerCase(), errors);
    return { normalized: { target, rows: deduped }, errors };
  }

  if (target === "groups") {
    const normalizedRows = rows
      .map(normalizeGroupRow)
      .filter((result): result is { row: GroupImportRow } => {
        if ("error" in result) {
          errors.push(result.error);
          return false;
        }
        return true;
      })
      .map(({ row }) => row);
    const deduped = removeDuplicateRows(normalizedRows, (row) => row.name.toLowerCase(), errors);
    return { normalized: { target, rows: deduped }, errors };
  }

  if (target === "artists") {
    const normalizedRows = rows
      .map(normalizeArtistRow)
      .filter((result): result is { row: ArtistImportRow } => {
        if ("error" in result) {
          errors.push(result.error);
          return false;
        }
        return true;
      })
      .map(({ row }) => row);
    const deduped = removeDuplicateRows(normalizedRows, (row) => row.name.toLowerCase(), errors);
    return { normalized: { target, rows: deduped }, errors };
  }

  const normalizedRows = rows
    .map((row) => normalizeSongRow(row, format))
    .filter((result): result is { row: SongImportRow } => {
      if ("error" in result) {
        errors.push(result.error);
        return false;
      }
      return true;
    })
    .map(({ row }) => row);
  const deduped = removeDuplicateRows(normalizedRows, (row) => row.title.toLowerCase(), errors);
  return { normalized: { target, rows: deduped }, errors };
}

function normalizePerformerRow(
  raw: RawImportRow,
  format: ImportFormat
): { row: PerformerImportRow } | { error: ImportRowPreview } {
  const aliasesValue = readValue(raw.value, ["aliases", "alias"]);
  const tagsValue = readValue(raw.value, ["tags", "tagNames"]);
  const parsed = performerSchema.safeParse({
    rowNumber: raw.rowNumber,
    name: readValue(raw.value, ["name"]),
    groupName: readValue(raw.value, ["group", "groupName"]),
    youtubeUrl: readValue(raw.value, ["youtubeUrl", "youTubeUrl", "youtubeURL", "youtube_url"]),
    officialUrl: readValue(raw.value, ["officialUrl", "officialURL", "official_url"]),
    colorCode: readValue(raw.value, ["colorCode", "color", "color_code"]),
    debutDate: readValue(raw.value, ["debutDate", "debut_date"]),
    birthday: readValue(raw.value, ["birthday","birthDay", "birth_date", "birthDate"]),
    tags: parseStringList(tagsValue, format),
    aliases: parseStringList(aliasesValue, format),
    status: readValue(raw.value, ["status"])
  });

  if (!parsed.success) {
    return { error: rowError(raw.rowNumber, getRowName(raw.value, "name"), formatZodError(parsed.error)) };
  }

  return {
    row: {
      ...parsed.data,
      tags: uniqueStrings(parsed.data.tags),
      aliases: uniqueStrings(parsed.data.aliases)
    }
  };
}

function normalizeGroupRow(raw: RawImportRow): { row: GroupImportRow } | { error: ImportRowPreview } {
  const parsed = groupSchema.safeParse({
    rowNumber: raw.rowNumber,
    name: readValue(raw.value, ["name"])
  });

  if (!parsed.success) {
    return { error: rowError(raw.rowNumber, getRowName(raw.value, "name"), formatZodError(parsed.error)) };
  }

  return { row: parsed.data };
}

function normalizeArtistRow(raw: RawImportRow): { row: ArtistImportRow } | { error: ImportRowPreview } {
  const parsed = artistSchema.safeParse({
    rowNumber: raw.rowNumber,
    name: readValue(raw.value, ["name"])
  });

  if (!parsed.success) {
    return { error: rowError(raw.rowNumber, getRowName(raw.value, "name"), formatZodError(parsed.error)) };
  }

  return { row: parsed.data };
}

function normalizeSongRow(
  raw: RawImportRow,
  format: ImportFormat
): { row: SongImportRow } | { error: ImportRowPreview } {
  const parsed = songSchema.safeParse({
    rowNumber: raw.rowNumber,
    title: readValue(raw.value, ["title"]),
    artistNames: parseStringList(readValue(raw.value, ["artists", "artistNames"]), format),
    originalUrl: readValue(raw.value, ["originalUrl", "originalURL", "original_url"])
  });

  if (!parsed.success) {
    return { error: rowError(raw.rowNumber, getRowName(raw.value, "title"), formatZodError(parsed.error)) };
  }

  return {
    row: {
      ...parsed.data,
      artistNames: uniqueStrings(parsed.data.artistNames)
    }
  };
}

async function buildRowPreview(normalized: NormalizedRows): Promise<ImportRowPreview[]> {
  if (normalized.target === "performers") {
    const existing = await findExistingPerformers(normalized.rows.map((row) => row.name));
    return normalized.rows.map((row) => ({
      rowNumber: row.rowNumber,
      name: row.name,
      action: existing.has(row.name.toLowerCase()) ? "update" : "create",
      errors: []
    }));
  }

  if (normalized.target === "groups") {
    const existing = await db.group.findMany({
      where: { name: { in: normalized.rows.map((row) => row.name) } },
      select: { name: true }
    });
    const existingNames = new Set(existing.map((group) => group.name));
    return normalized.rows.map((row) => ({
      rowNumber: row.rowNumber,
      name: row.name,
      action: existingNames.has(row.name) ? "skip" : "create",
      errors: []
    }));
  }

  if (normalized.target === "artists") {
    const existing = await db.artist.findMany({
      where: { name: { in: normalized.rows.map((row) => row.name) } },
      select: { name: true }
    });
    const existingNames = new Set(existing.map((artist) => artist.name));
    return normalized.rows.map((row) => ({
      rowNumber: row.rowNumber,
      name: row.name,
      action: existingNames.has(row.name) ? "skip" : "create",
      errors: []
    }));
  }

  const existing = await findExistingSongs(normalized.rows.map((row) => row.title));
  return normalized.rows.map((row) => ({
    rowNumber: row.rowNumber,
    name: row.title,
    action: existing.has(row.title.toLowerCase()) ? "update" : "create",
    errors: []
  }));
}

async function executeValidatedRows(
  client: TransactionClient,
  normalized: NormalizedRows
): Promise<ImportExecutionResult> {
  if (normalized.target === "performers") {
    return executePerformerImport(client, normalized.rows);
  }
  if (normalized.target === "groups") {
    return executeGroupImport(client, normalized.rows);
  }
  if (normalized.target === "artists") {
    return executeArtistImport(client, normalized.rows);
  }
  return executeSongImport(client, normalized.rows);
}

async function executePerformerImport(
  client: TransactionClient,
  rows: PerformerImportRow[]
): Promise<ImportExecutionResult> {
  const result = emptyExecutionResult();

  for (const row of rows) {
    const group = row.groupName
      ? await client.group.upsert({
          where: { name: row.groupName },
          create: { name: row.groupName },
          update: {}
        })
      : null;
    const existing = await client.performer.findFirst({
      where: { name: { equals: row.name, mode: Prisma.QueryMode.insensitive } }
    });
    const data: Prisma.PerformerUpdateInput = {
      name: row.name,
      status: row.status
    };

    if (group) {
      data.group = { connect: { id: group.id } };
    }
    if (row.youtubeUrl) {
      data.youtubeUrl = row.youtubeUrl;
    }
    if (row.officialUrl) {
      data.officialUrl = row.officialUrl;
    }
    if (row.colorCode) {
      data.colorCode = row.colorCode;
    }
    if (row.debutDate) {
      data.debutDate = row.debutDate;
    }
    if (row.birthday) {
      data.birthday = row.birthday;
    }

    const performer =
      existing ??
      (await client.performer.create({
        data: {
          name: row.name,
          groupId: group?.id,
          youtubeUrl: row.youtubeUrl,
          officialUrl: row.officialUrl,
          colorCode: row.colorCode,
          debutDate: row.debutDate,
          birthday: row.birthday,
          status: row.status
        }
      }));

    if (existing) {
      await client.performer.update({
        where: { id: existing.id },
        data
      });
      result.updatedCount += 1;
    } else {
      result.createdCount += 1;
    }

    await createAliases(client, performer.id, row.aliases);
    await addPerformerTags(client, performer.id, row.tags);
    result.names.push(row.name);
  }

  return result;
}

async function executeGroupImport(
  client: TransactionClient,
  rows: GroupImportRow[]
): Promise<ImportExecutionResult> {
  const result = emptyExecutionResult();

  for (const row of rows) {
    const existing = await client.group.findUnique({ where: { name: row.name } });
    if (existing) {
      result.skippedCount += 1;
      continue;
    }

    await client.group.create({ data: { name: row.name } });
    result.createdCount += 1;
    result.names.push(row.name);
  }

  return result;
}

async function executeArtistImport(
  client: TransactionClient,
  rows: ArtistImportRow[]
): Promise<ImportExecutionResult> {
  const result = emptyExecutionResult();

  for (const row of rows) {
    const existing = await client.artist.findUnique({ where: { name: row.name } });
    if (existing) {
      result.skippedCount += 1;
      continue;
    }

    await client.artist.create({ data: { name: row.name } });
    result.createdCount += 1;
    result.names.push(row.name);
  }

  return result;
}

async function executeSongImport(
  client: TransactionClient,
  rows: SongImportRow[]
): Promise<ImportExecutionResult> {
  const result = emptyExecutionResult();

  for (const row of rows) {
    const artists = [];
    for (const name of row.artistNames) {
      artists.push(
        await client.artist.upsert({
          where: { name },
          create: { name },
          update: {}
        })
      );
    }

    const existing = await client.song.findFirst({
      where: { title: { equals: row.title, mode: Prisma.QueryMode.insensitive } }
    });
    const song =
      existing ??
      (await client.song.create({
        data: {
          title: row.title,
          originalUrl: row.originalUrl
        }
      }));

    if (existing) {
      await client.song.update({
        where: { id: existing.id },
        data: {
          title: row.title,
          ...(row.originalUrl ? { originalUrl: row.originalUrl } : {})
        }
      });
      result.updatedCount += 1;
    } else {
      result.createdCount += 1;
    }

    for (const artist of artists) {
      await client.songArtist.upsert({
        where: {
          songId_artistId: {
            songId: song.id,
            artistId: artist.id
          }
        },
        create: {
          songId: song.id,
          artistId: artist.id
        },
        update: {}
      });
    }

    result.names.push(row.title);
  }

  return result;
}

async function createAliases(client: TransactionClient, performerId: string, aliases: string[]) {
  const uniqueAliases = uniqueStrings(aliases);
  if (uniqueAliases.length === 0) {
    return;
  }

  await client.performerAlias.createMany({
    data: uniqueAliases.map((alias) => ({ performerId, alias })),
    skipDuplicates: true
  });
}

async function findExistingPerformers(names: string[]) {
  if (names.length === 0) {
    return new Set<string>();
  }

  const performers = await db.performer.findMany({
    where: {
      OR: names.map((name) => ({ name: { equals: name, mode: Prisma.QueryMode.insensitive } }))
    },
    select: { name: true }
  });

  return new Set(performers.map((performer) => performer.name.toLowerCase()));
}

async function findExistingSongs(titles: string[]) {
  if (titles.length === 0) {
    return new Set<string>();
  }

  const songs = await db.song.findMany({
    where: {
      OR: titles.map((title) => ({ title: { equals: title, mode: Prisma.QueryMode.insensitive } }))
    },
    select: { title: true }
  });

  return new Set(songs.map((song) => song.title.toLowerCase()));
}

function summarizeRows(totalRows: number, rows: ImportRowPreview[]): ImportSummary {
  return {
    totalRows,
    createCount: rows.filter((row) => row.action === "create").length,
    updateCount: rows.filter((row) => row.action === "update").length,
    skipCount: rows.filter((row) => row.action === "skip").length,
    errorCount: rows.filter((row) => row.action === "error").length
  };
}

function parseCsv(content: string): {
  rows: string[][];
  error?: { rowNumber: number; message: string };
} {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let rowNumber = 1;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      if (next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      rowNumber += 1;
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      rowNumber += 1;
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    return { rows: [], error: { rowNumber, message: "引用符が閉じられていません。" } };
  }

  row.push(field);
  rows.push(row);

  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === "")) {
    rows.pop();
  }

  return { rows };
}

function emptyNormalizedRows(target: ImportTarget): NormalizedRows {
  if (target === "performers") {
    return { target, rows: [] };
  }
  if (target === "groups") {
    return { target, rows: [] };
  }
  if (target === "artists") {
    return { target, rows: [] };
  }
  return { target, rows: [] };
}

function rowError(rowNumber: number, name: string, errors: string | string[]): ImportRowPreview {
  return {
    rowNumber,
    name,
    action: "error",
    errors: Array.isArray(errors) ? errors : [errors]
  };
}

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.filter((part) => part !== "rowNumber").join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

function readValue(record: Record<string, unknown>, keys: string[]) {
  const keySet = new Set(keys.map((key) => key.toLowerCase()));
  const entry = Object.entries(record).find(([key]) => keySet.has(key.toLowerCase()));
  return entry?.[1];
}

function getRowName(record: Record<string, unknown>, key: string) {
  const value = readValue(record, [key]);
  return typeof value === "string" && value.trim() ? value.trim() : "(名称未入力)";
}

function parseStringList(value: unknown, format: ImportFormat): unknown {
  if (value == null || value === "") {
    return [];
  }

  if (format === "json") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeUrl(value: unknown) {
  const text = optionalString(value);
  if (!text) {
    return undefined;
  }

  const markdownLink = text.match(/^\[[^\]]*]\((https?:\/\/[^)]+)\)$/i);
  if (markdownLink) {
    return markdownLink[1];
  }

  return text.replace(/^<(.+)>$/, "$1");
}

function removeDuplicateRows<T extends { rowNumber: number }>(
  rows: T[],
  getKey: (row: T) => string,
  errors: ImportRowPreview[]
) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const row of rows) {
    const key = getKey(row);
    if (seen.has(key)) {
      errors.push(rowError(row.rowNumber, "重複行", "同じ入力内でキーが重複しています。"));
    } else {
      seen.add(key);
      deduped.push(row);
    }
  }

  return deduped;
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }

  return [...duplicates];
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}

function emptyExecutionResult(): ImportExecutionResult {
  return {
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    names: [],
    errors: []
  };
}

function comparePreviewRows(a: ImportRowPreview, b: ImportRowPreview) {
  return a.rowNumber - b.rowNumber;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isImportTarget(value: FormDataEntryValue | null): value is ImportTarget {
  return typeof value === "string" && importTargets.includes(value as ImportTarget);
}

function isImportFormat(value: FormDataEntryValue | null): value is ImportFormat {
  return typeof value === "string" && importFormats.includes(value as ImportFormat);
}
