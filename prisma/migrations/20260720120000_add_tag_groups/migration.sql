-- CreateTable
CREATE TABLE "tag_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_group_tags" (
    "tagGroupId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "tag_group_tags_pkey" PRIMARY KEY ("tagGroupId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "tag_groups_name_key" ON "tag_groups"("name");

-- CreateIndex
CREATE INDEX "tag_group_tags_tagId_idx" ON "tag_group_tags"("tagId");

-- AddForeignKey
ALTER TABLE "tag_group_tags" ADD CONSTRAINT "tag_group_tags_tagGroupId_fkey" FOREIGN KEY ("tagGroupId") REFERENCES "tag_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_group_tags" ADD CONSTRAINT "tag_group_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
