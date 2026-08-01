// 壊れた sourceUrl（t= の重複や si=・list= の付随パラメータ混入）を正規化して修復する。
// タイムスタンプは timestampSeconds 側に保持されているため、sourceUrl からは落としてよい。
//
//   pnpm tsx scripts/repair-cover-source-urls.ts          # ドライラン（対象を表示するだけ）
//   pnpm tsx scripts/repair-cover-source-urls.ts --apply  # 実際に更新する
import { PrismaClient } from "@prisma/client";

import { extractYouTubeVideoId, normalizeYouTubeSourceUrl } from "../lib/youtube";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const covers = await prisma.cover.findMany({
    select: { id: true, sourceUrl: true, sourceVideoId: true }
  });

  const targets = covers.flatMap((cover) => {
    const normalized = normalizeYouTubeSourceUrl(cover.sourceUrl);
    const videoId = extractYouTubeVideoId(normalized);
    const needsUrlFix = normalized !== cover.sourceUrl;
    const needsVideoIdFix = videoId != null && cover.sourceVideoId !== videoId;

    if (!needsUrlFix && !needsVideoIdFix) {
      return [];
    }

    return [{ id: cover.id, from: cover.sourceUrl, to: normalized, videoId }];
  });

  // 参考: t= が重複しているレコードを別途カウント（症状の把握用）。
  const duplicatedTimestamp = covers.filter(
    (cover) => (cover.sourceUrl.match(/[?&]t=/g) ?? []).length >= 2
  ).length;

  console.log(`全 ${covers.length} 件中、修復対象 ${targets.length} 件（t= 重複 ${duplicatedTimestamp} 件）`);
  for (const target of targets) {
    console.log(`- ${target.id}`);
    console.log(`    from: ${target.from}`);
    console.log(`    to:   ${target.to}`);
  }

  if (!APPLY) {
    console.log("\nドライランです。実際に更新するには --apply を付けて再実行してください。");
    return;
  }

  for (const target of targets) {
    await prisma.cover.update({
      where: { id: target.id },
      data: { sourceUrl: target.to, sourceVideoId: target.videoId }
    });
  }

  console.log(`\n更新完了: ${targets.length} 件`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
