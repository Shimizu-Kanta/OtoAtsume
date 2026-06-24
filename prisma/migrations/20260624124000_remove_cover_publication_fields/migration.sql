ALTER TABLE "covers"
  DROP COLUMN "sourceVisibility",
  DROP COLUMN "sourceIsPublic",
  DROP COLUMN "memo";

DROP TYPE "SourceVisibility";
DROP TYPE "SourcePublicity";
