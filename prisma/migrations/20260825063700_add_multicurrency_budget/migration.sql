-- Migration: Tuần 2 — Multi-Currency & Cross-Subsidy Budget
-- QUAN TRỌNG: Dùng RENAME COLUMN để giữ data currency hiện có, KHÔNG dùng DROP+ADD

-- 1. Rename column currency → baseCurrency trên bảng Event (giữ toàn bộ dữ liệu cũ)
ALTER TABLE "Event" RENAME COLUMN "currency" TO "baseCurrency";

-- 2. Thêm creatorDeviceToken vào Event (soft identity của người tạo)
ALTER TABLE "Event" ADD COLUMN "creatorDeviceToken" TEXT;

-- 3. Thêm các trường đa tiền tệ vào Expense
ALTER TABLE "Expense" ADD COLUMN "originalCurrency" TEXT;
ALTER TABLE "Expense" ADD COLUMN "exchangeRate" DECIMAL(18, 6);
ALTER TABLE "Expense" ADD COLUMN "isCrossSubsidy" BOOLEAN NOT NULL DEFAULT false;
