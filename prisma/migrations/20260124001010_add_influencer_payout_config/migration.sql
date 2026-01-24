-- CreateTable
CREATE TABLE "InfluencerPayoutConfig" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "recipientCode" TEXT NOT NULL,
    "last4Digits" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerPayoutConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerPayoutConfig_influencerId_key" ON "InfluencerPayoutConfig"("influencerId");

-- AddForeignKey
ALTER TABLE "InfluencerPayoutConfig" ADD CONSTRAINT "InfluencerPayoutConfig_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
