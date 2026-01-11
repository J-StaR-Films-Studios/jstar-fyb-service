-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "ProjectChatMessage_conversationId_idx" ON "ProjectChatMessage"("conversationId");

-- CreateIndex
CREATE INDEX "ResearchDocument_projectId_idx" ON "ResearchDocument"("projectId");

-- CreateIndex
CREATE INDEX "TopicSwitchArchive_requestId_idx" ON "TopicSwitchArchive"("requestId");

-- MANUAL PATCH: Add referredById if missing (Fix for Prod Baseline Drift)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'referredById') THEN
        ALTER TABLE "User" ADD COLUMN "referredById" TEXT;
    END IF;
END $$;

-- MANUAL PATCH: Add FK Constraint if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_referredById_fkey') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
