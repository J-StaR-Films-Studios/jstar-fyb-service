/*
  Warnings:

  - You are about to drop the column `accountName` on the `Influencer` table. All the data in the column will be lost.
  - You are about to drop the column `accountNumber` on the `Influencer` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `Influencer` table. All the data in the column will be lost.
  - You are about to drop the column `lastLogin` on the `Influencer` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Influencer` table. All the data in the column will be lost.
  - You are about to drop the column `resetExpires` on the `Influencer` table. All the data in the column will be lost.
  - You are about to drop the column `resetToken` on the `Influencer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Influencer" DROP COLUMN "accountName",
DROP COLUMN "accountNumber",
DROP COLUMN "bankName",
DROP COLUMN "lastLogin",
DROP COLUMN "password",
DROP COLUMN "resetExpires",
DROP COLUMN "resetToken";
