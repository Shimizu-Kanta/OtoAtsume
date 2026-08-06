import { ContentStatus, MasterDataStatus } from "@prisma/client";
import type { MetadataRoute } from "next";

import {
  evaluateGroupQuality,
  evaluatePerformerQuality,
  evaluateSongQuality
} from "@/lib/content-quality";
import { getIndexableCoverSitemapEntries } from "@/lib/data/covers";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";

// Docker build (Dockerfile builder stage) runs `next build` without a
// reachable DATABASE_URL, so this route must not be statically prerendered.
export const dynamic = "force-dynamic";

const approvedCoverCount = {
  covers: { where: { status: ContentStatus.APPROVED } }
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [covers, performers, songs, groups] = await Promise.all([
    getIndexableCoverSitemapEntries(),
    db.performer.findMany({
      where: { status: MasterDataStatus.APPROVED },
      select: {
        id: true,
        updatedAt: true,
        status: true,
        _count: {
          select: {
            covers: { where: { cover: { status: ContentStatus.APPROVED } } }
          }
        }
      }
    }),
    db.song.findMany({
      select: {
        id: true,
        updatedAt: true,
        _count: { select: approvedCoverCount }
      }
    }),
    db.group.findMany({
      where: {
        performers: { some: { status: MasterDataStatus.APPROVED } }
      },
      select: {
        id: true,
        performers: {
          where: { status: MasterDataStatus.APPROVED },
          select: {
            _count: {
              select: {
                covers: { where: { cover: { status: ContentStatus.APPROVED } } }
              }
            }
          }
        }
      }
    })
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/covers`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/songs`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/performers`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/groups`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/rankings`, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/stats`, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 }
  ];

  // 歌唱記録詳細は1件でも固有情報を持つため除外しない。
  const coverEntries: MetadataRoute.Sitemap = covers.map((cover) => ({
    url: `${siteUrl}/covers/${cover.id}`,
    lastModified: cover.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6
  }));

  // 記録ゼロの活動者（約390件）は薄いページのため sitemap から除外する。
  const performerEntries: MetadataRoute.Sitemap = performers
    .filter((performer) => evaluatePerformerQuality(performer._count.covers, performer.status).isIndexable)
    .map((performer) => ({
      url: `${siteUrl}/performers/${performer.id}`,
      lastModified: performer.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6
    }));

  const songEntries: MetadataRoute.Sitemap = songs
    .filter((song) => evaluateSongQuality(song._count.covers).isIndexable)
    .map((song) => ({
      url: `${siteUrl}/songs/${song.id}`,
      lastModified: song.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6
    }));

  const groupEntries: MetadataRoute.Sitemap = groups
    .filter((group) => {
      const totalCovers = group.performers.reduce((sum, performer) => sum + performer._count.covers, 0);
      return evaluateGroupQuality(totalCovers).isIndexable;
    })
    .map((group) => ({
      url: `${siteUrl}/groups/${group.id}`,
      changeFrequency: "weekly",
      priority: 0.6
    }));

  return [...staticEntries, ...coverEntries, ...performerEntries, ...songEntries, ...groupEntries];
}
