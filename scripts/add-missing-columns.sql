-- Add missing columns to Lead table
ALTER TABLE "Lead" ADD COLUMN "tier" TEXT;
ALTER TABLE "Lead" ADD COLUMN "source" TEXT DEFAULT 'JAY_CHAT';
ALTER TABLE "Lead" ADD COLUMN "name" TEXT;
ALTER TABLE "Lead" ADD COLUMN "email" TEXT;

-- Add missing column to Influencer table
ALTER TABLE "Influencer" ADD COLUMN "referralDiscount" REAL DEFAULT 0.0;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS "Lead_userId_idx" ON "Lead"("userId");
CREATE INDEX IF NOT EXISTS "Lead_anonymousId_idx" ON "Lead"("anonymousId");
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Commission_influencerId_idx" ON "Commission"("influencerId");
CREATE INDEX IF NOT EXISTS "Conversation_anonymousId_idx" ON "Conversation"("anonymousId");
CREATE INDEX IF NOT EXISTS "Conversation_userId_idx" ON "Conversation"("userId");
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX IF NOT EXISTS "Payment_discountCodeId_idx" ON "Payment"("discountCodeId");
CREATE INDEX IF NOT EXISTS "Payment_projectId_idx" ON "Payment"("projectId");
CREATE INDEX IF NOT EXISTS "Project_anonymousId_idx" ON "Project"("anonymousId");
CREATE INDEX IF NOT EXISTS "Project_updatedAt_idx" ON "Project"("updatedAt");
CREATE INDEX IF NOT EXISTS "ProjectMessage_projectId_idx" ON "ProjectMessage"("projectId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "TopicSwitchRequest_createdAt_idx" ON "TopicSwitchRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "TopicSwitchRequest_projectId_idx" ON "TopicSwitchRequest"("projectId");
CREATE INDEX IF NOT EXISTS "TopicSwitchRequest_userId_idx" ON "TopicSwitchRequest"("userId");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_referredById_idx" ON "User"("referredById");
