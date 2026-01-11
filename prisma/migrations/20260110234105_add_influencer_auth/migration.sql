-- MANUAL PATCH: Create Influencer table if missing (Fix for Prod Baseline Drift)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Influencer') THEN
        CREATE TABLE "Influencer" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "phone" TEXT,
            "referralCode" TEXT NOT NULL,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
            "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "pendingPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "freeCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "creditsUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
        );
        -- Re-add indexes and keys that would have been in fresh_reset
        CREATE UNIQUE INDEX "Influencer_email_key" ON "Influencer"("email");
        CREATE UNIQUE INDEX "Influencer_referralCode_key" ON "Influencer"("referralCode");
    END IF;
END $$;

-- AlterTable
ALTER TABLE "Influencer" ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "password" TEXT,
ADD COLUMN     "resetExpires" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT;
