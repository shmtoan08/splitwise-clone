-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'MARKED_PAID', 'CONFIRMED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "deviceToken" TEXT,
    "paymentInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payerId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseSplit" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_deviceToken_key" ON "Participant"("deviceToken");

-- CreateIndex
CREATE INDEX "Participant_eventId_idx" ON "Participant"("eventId");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "Participant"("userId");

-- CreateIndex
CREATE INDEX "Expense_eventId_idx" ON "Expense"("eventId");

-- CreateIndex
CREATE INDEX "Expense_payerId_idx" ON "Expense"("payerId");

-- CreateIndex
CREATE INDEX "ExpenseSplit_participantId_idx" ON "ExpenseSplit"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSplit_expenseId_participantId_key" ON "ExpenseSplit"("expenseId", "participantId");

-- CreateIndex
CREATE INDEX "Settlement_eventId_idx" ON "Settlement"("eventId");

-- CreateIndex
CREATE INDEX "Settlement_fromId_idx" ON "Settlement"("fromId");

-- CreateIndex
CREATE INDEX "Settlement_toId_idx" ON "Settlement"("toId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
