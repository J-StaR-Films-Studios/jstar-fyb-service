/*
  Warnings:

  - You are about to alter the column `referralDiscount` on the `Influencer` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Real`.

*/
-- DropIndex
DROP INDEX "Commission_influencerId_idx";

-- AlterTable
ALTER TABLE "Influencer" ALTER COLUMN "referralDiscount" DROP NOT NULL,
ALTER COLUMN "referralDiscount" SET DATA TYPE REAL;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "source" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ResearchDocument" ADD COLUMN     "abstractText" TEXT,
ADD COLUMN     "authors" TEXT,
ADD COLUMN     "citationCount" INTEGER,
ADD COLUMN     "openAccessUrl" TEXT,
ADD COLUMN     "semanticScholarId" TEXT,
ADD COLUMN     "snippet" TEXT,
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'WEB',
ADD COLUMN     "venue" TEXT;

-- CreateIndex
CREATE INDEX "Commission_influencerId_status_idx" ON "Commission"("influencerId", "status");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "TopicSwitchRequest_projectId_status_idx" ON "TopicSwitchRequest"("projectId", "status");
