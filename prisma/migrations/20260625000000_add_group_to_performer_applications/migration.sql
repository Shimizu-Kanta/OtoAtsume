ALTER TABLE "performer_applications"
  ADD COLUMN "groupId" TEXT;

CREATE INDEX "performer_applications_groupId_idx" ON "performer_applications"("groupId");

ALTER TABLE "performer_applications"
  ADD CONSTRAINT "performer_applications_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
