-- AlterTable
ALTER TABLE "performers" ADD COLUMN     "birthday" DATE;

-- CreateIndex
CREATE INDEX "performers_birthday_idx" ON "performers"("birthday");
