import { ContentStatus, MasterDataStatus } from "@prisma/client";
import type { MetadataRoute } from "next";

import { db } from "@/lib/db";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://oto-atsume.com").trim();

// Docker build (Dockerfile builder stage) runs `next build` without a
// reachable DATABASE_URL, so this route must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [covers, performers, songs, groups] = await Promise.all([
    db.cover.findMany({
      where: { status: ContentStatus.APPROVED },
      select: { id: true, updatedAt: true }
    }),
    db.performer.findMany({
      where: { status: MasterDataStatus.APPROVED },
      select: { id: true, updatedAt: true }
    }),
    db.song.findMany({
      select: { id: true, updatedAt: true }
    }),
    db.group.findMany({
      where: {
        performers: { some: { status: MasterDataStatus.APPROVED } }
      },
      select: { id: true }
    })
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/covers`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/songs`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/performers`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/groups`, changeFrequency: "weekly", priority: 0.8 }
  ];

  const coverEntries: MetadataRoute.Sitemap = covers.map((cover) => ({
    url: `${siteUrl}/covers/${cover.id}`,
    lastModified: cover.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6
  }));

  const performerEntries: MetadataRoute.Sitemap = performers.map((performer) => ({
    url: `${siteUrl}/performers/${performer.id}`,
    lastModified: performer.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6
  }));

  const songEntries: MetadataRoute.Sitemap = songs.map((song) => ({
    url: `${siteUrl}/songs/${song.id}`,
    lastModified: song.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6
  }));

  const groupEntries: MetadataRoute.Sitemap = groups.map((group) => ({
    url: `${siteUrl}/groups/${group.id}`,
    changeFrequency: "weekly",
    priority: 0.6
  }));

  return [...staticEntries, ...coverEntries, ...performerEntries, ...songEntries, ...groupEntries];
}
