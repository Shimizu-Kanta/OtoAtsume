-- AlterTable
ALTER TABLE "songs" ADD COLUMN     "originalUrlCandidates" JSONB,
ADD COLUMN     "originalUrlCandidatesFetchedAt" TIMESTAMP(3);
