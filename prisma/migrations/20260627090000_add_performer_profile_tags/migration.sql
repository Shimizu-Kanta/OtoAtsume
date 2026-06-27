-- AlterTable
ALTER TABLE "performers"
ADD COLUMN "colorCode" TEXT,
ADD COLUMN "debutDate" DATE;

-- CreateTable
CREATE TABLE "tags" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performer_tags" (
  "performerId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,

  CONSTRAINT "performer_tags_pkey" PRIMARY KEY ("performerId", "tagId")
);

-- CreateIndex
CREATE INDEX "performers_debutDate_idx" ON "performers"("debutDate");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "performer_tags_tagId_idx" ON "performer_tags"("tagId");

-- AddForeignKey
ALTER TABLE "performer_tags"
ADD CONSTRAINT "performer_tags_performerId_fkey"
FOREIGN KEY ("performerId") REFERENCES "performers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performer_tags"
ADD CONSTRAINT "performer_tags_tagId_fkey"
FOREIGN KEY ("tagId") REFERENCES "tags"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
