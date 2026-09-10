-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "outro" TEXT,
    "links" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_items" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "coverId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "feature_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "features_slug_key" ON "features"("slug");

-- CreateIndex
CREATE INDEX "features_status_publishedAt_idx" ON "features"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "feature_items_featureId_position_idx" ON "feature_items"("featureId", "position");

-- CreateIndex
CREATE INDEX "feature_items_coverId_idx" ON "feature_items"("coverId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_items_featureId_coverId_key" ON "feature_items"("featureId", "coverId");

-- AddForeignKey
ALTER TABLE "feature_items" ADD CONSTRAINT "feature_items_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_items" ADD CONSTRAINT "feature_items_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "covers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
