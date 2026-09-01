-- CreateEnum
CREATE TYPE "RoundingMode" AS ENUM ('ROUND_ROBIN', 'ROUND_UP');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "roundingMode" "RoundingMode" NOT NULL DEFAULT 'ROUND_ROBIN';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "surplus" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "remainderBurden" INTEGER NOT NULL DEFAULT 0;
