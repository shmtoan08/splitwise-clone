-- CreateEnum
CREATE TYPE "SplitMode" AS ENUM ('EVEN', 'CUSTOM', 'SHARES');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "splitMode" "SplitMode" NOT NULL DEFAULT 'EVEN';
