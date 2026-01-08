-- AlterTable
ALTER TABLE "ProjectConversation" ADD COLUMN     "contextScope" JSONB,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "threadTitle" TEXT,
ADD COLUMN     "threadType" TEXT NOT NULL DEFAULT 'general';

-- CreateIndex
CREATE INDEX "ProjectConversation_projectId_threadType_idx" ON "ProjectConversation"("projectId", "threadType");
