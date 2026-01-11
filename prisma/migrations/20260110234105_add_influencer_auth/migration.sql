-- AlterTable
ALTER TABLE "Influencer" ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "password" TEXT,
ADD COLUMN     "resetExpires" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT;
