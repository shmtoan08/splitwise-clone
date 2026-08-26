-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "familyConfig" JSONB,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
