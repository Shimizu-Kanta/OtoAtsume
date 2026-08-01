// 既存の全 Cover レコードに sourceVideoId を埋めるバックフィル（一度きり・冪等）。
// sourceUrl の文字列が多少壊れていても v= の値さえ正しければ videoId は揃う。
//
//   pnpm tsx scripts/backfill-source-video-id.ts
//
// 実行後、YouTube 以外の URL を持つレコードは sourceVideoId が null のままでよい。
import { PrismaClient } from "@prisma/client";

import { extractYouTubeVideoId } from "../lib/youtube";

const prisma = new PrismaClient();

async function main() {
  const covers = await prisma.cover.findMany({
    select: { id: true, sourceUrl: true, sourceVideoId: true }
  });

  let updated = 0;
  let nonYouTube = 0;

  for (const cover of covers) {
    const videoId = extractYouTubeVideoId(cover.sourceUrl);

    if (videoId == null) {
      nonYouTube += 1;
      continue;
    }

    if (cover.sourceVideoId !== videoId) {
      await prisma.cover.update({
        where: { id: cover.id },
        data: { sourceVideoId: videoId }
      });
      updated += 1;
    }
  }

  console.log(
    `covers=${covers.length} updated=${updated} unchanged=${covers.length - updated - nonYouTube} nonYouTube(null)=${nonYouTube}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
