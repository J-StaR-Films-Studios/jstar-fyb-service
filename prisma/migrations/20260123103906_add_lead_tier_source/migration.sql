-- AlterTable
ALTER TABLE "Influencer" ADD COLUMN     "referralDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "email" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'JAY_CHAT',
ADD COLUMN     "tier" TEXT;

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Commission_influencerId_idx" ON "Commission"("influencerId");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Conversation_anonymousId_idx" ON "Conversation"("anonymousId");

-- CreateIndex
CREATE INDEX "Lead_userId_idx" ON "Lead"("userId");

-- CreateIndex
CREATE INDEX "Lead_anonymousId_idx" ON "Lead"("anonymousId");

-- CreateIndex
CREATE INDEX "Payment_projectId_idx" ON "Payment"("projectId");

-- CreateIndex
CREATE INDEX "Payment_discountCodeId_idx" ON "Payment"("discountCodeId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Project_anonymousId_idx" ON "Project"("anonymousId");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "ProjectMessage_projectId_idx" ON "ProjectMessage"("projectId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "TopicSwitchRequest_userId_idx" ON "TopicSwitchRequest"("userId");

-- CreateIndex
CREATE INDEX "TopicSwitchRequest_projectId_idx" ON "TopicSwitchRequest"("projectId");

-- CreateIndex
CREATE INDEX "TopicSwitchRequest_createdAt_idx" ON "TopicSwitchRequest"("createdAt");

-- CreateIndex
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
