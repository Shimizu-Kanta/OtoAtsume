CREATE TYPE "AdminRole" AS ENUM ('ADMIN');
CREATE TYPE "MasterDataStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN');
CREATE TYPE "ContentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');
CREATE TYPE "CoverType" AS ENUM ('COVER_VIDEO', 'KARAOKE_STREAM', 'LIVE_EVENT', 'SHORT', 'OTHER');
CREATE TYPE "SourceVisibility" AS ENUM ('PUBLIC', 'MEMBERS_ONLY', 'PAID_LIVE', 'PRIVATE', 'UNKNOWN');
CREATE TYPE "SourcePublicity" AS ENUM ('PUBLICLY_AVAILABLE', 'NOT_PUBLIC', 'UNKNOWN');
CREATE TYPE "ReportReason" AS ENUM ('WRONG_SONG', 'WRONG_PERFORMER', 'WRONG_DATE', 'BROKEN_URL', 'MEMBERS_ONLY_CONTENT', 'NON_PUBLIC_PAID_CONTENT', 'DUPLICATE', 'OTHER');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'REJECTED');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "admin_users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "groups" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "performers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "groupId" TEXT,
  "youtubeUrl" TEXT,
  "officialUrl" TEXT,
  "status" "MasterDataStatus" NOT NULL DEFAULT 'APPROVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "performers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "performer_aliases" (
  "id" TEXT NOT NULL,
  "performerId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  CONSTRAINT "performer_aliases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "artists" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "songs" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "originalUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "song_artists" (
  "id" TEXT NOT NULL,
  "songId" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  CONSTRAINT "song_artists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "covers" (
  "id" TEXT NOT NULL,
  "songId" TEXT NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL,
  "coverType" "CoverType" NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceTitle" TEXT,
  "timestampSeconds" INTEGER,
  "sourceVisibility" "SourceVisibility" NOT NULL DEFAULT 'PUBLIC',
  "sourceIsPublic" "SourcePublicity" NOT NULL DEFAULT 'UNKNOWN',
  "memo" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'APPROVED',
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "covers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cover_performers" (
  "id" TEXT NOT NULL,
  "coverId" TEXT NOT NULL,
  "performerId" TEXT NOT NULL,
  CONSTRAINT "cover_performers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
  "id" TEXT NOT NULL,
  "coverId" TEXT NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "memo" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "performer_applications" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "memo" TEXT,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "performer_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");
CREATE INDEX "performers_name_idx" ON "performers"("name");
CREATE INDEX "performers_groupId_idx" ON "performers"("groupId");
CREATE UNIQUE INDEX "performer_aliases_performerId_alias_key" ON "performer_aliases"("performerId", "alias");
CREATE INDEX "performer_aliases_alias_idx" ON "performer_aliases"("alias");
CREATE UNIQUE INDEX "artists_name_key" ON "artists"("name");
CREATE INDEX "artists_name_idx" ON "artists"("name");
CREATE INDEX "songs_title_idx" ON "songs"("title");
CREATE UNIQUE INDEX "song_artists_songId_artistId_key" ON "song_artists"("songId", "artistId");
CREATE INDEX "song_artists_artistId_idx" ON "song_artists"("artistId");
CREATE INDEX "covers_songId_idx" ON "covers"("songId");
CREATE INDEX "covers_performedAt_idx" ON "covers"("performedAt");
CREATE INDEX "covers_sourceUrl_idx" ON "covers"("sourceUrl");
CREATE INDEX "covers_coverType_idx" ON "covers"("coverType");
CREATE INDEX "covers_status_idx" ON "covers"("status");
CREATE UNIQUE INDEX "cover_performers_coverId_performerId_key" ON "cover_performers"("coverId", "performerId");
CREATE INDEX "cover_performers_performerId_idx" ON "cover_performers"("performerId");
CREATE INDEX "reports_coverId_idx" ON "reports"("coverId");
CREATE INDEX "reports_status_idx" ON "reports"("status");
CREATE INDEX "performer_applications_name_idx" ON "performer_applications"("name");
CREATE INDEX "performer_applications_status_idx" ON "performer_applications"("status");

ALTER TABLE "performers" ADD CONSTRAINT "performers_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "performer_aliases" ADD CONSTRAINT "performer_aliases_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "performers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "song_artists" ADD CONSTRAINT "song_artists_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "song_artists" ADD CONSTRAINT "song_artists_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "covers" ADD CONSTRAINT "covers_songId_fkey" FOREIGN KEY ("songId") REFERENCES "songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cover_performers" ADD CONSTRAINT "cover_performers_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "covers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cover_performers" ADD CONSTRAINT "cover_performers_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "performers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "covers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
