import { getLatestCovers } from "@/lib/data/covers";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oto-atsume.com";

// Docker build 時はDBに到達できないため、ビルド時静的化を無効にする。
export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const covers = await getLatestCovers(30);

  const items = covers
    .map((cover) => {
      const performers = cover.performers.map(({ performer }) => performer.name).join(", ");
      const title = `${cover.song.title} / ${performers}`;
      const url = `${siteUrl}/covers/${cover.id}`;

      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(cover.performedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>おとあつめ 新着カバー記録</title>
    <link>${siteUrl}</link>
    <description>VTuber・歌い手の歌ってみた・歌枠・ライブ歌唱記録の新着一覧</description>
    <language>ja</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
