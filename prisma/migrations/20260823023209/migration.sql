/*
  Warnings:

  - A unique constraint covering the columns `[eventId,deviceToken]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Participant_deviceToken_key";

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_deviceToken_key" ON "Participant"("eventId", "deviceToken");
