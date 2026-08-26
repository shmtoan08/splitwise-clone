-- Bước 1: Tạo enum type mới, chỉ 2 giá trị
CREATE TYPE "SplitMode_new" AS ENUM ('AMOUNT', 'SHARES');

-- Bước 2: Đổi cột sang type mới, map dữ liệu cũ (EVEN, CUSTOM -> AMOUNT)
ALTER TABLE "Expense"
  ALTER COLUMN "splitMode" DROP DEFAULT,
  ALTER COLUMN "splitMode" TYPE "SplitMode_new"
  USING (
    CASE "splitMode"::text
      WHEN 'EVEN' THEN 'AMOUNT'
      WHEN 'CUSTOM' THEN 'AMOUNT'
      WHEN 'SHARES' THEN 'SHARES'
    END
  )::"SplitMode_new";

-- Bước 3: Xoá enum type cũ, đổi tên type mới về đúng tên gốc
DROP TYPE "SplitMode";
ALTER TYPE "SplitMode_new" RENAME TO "SplitMode";

-- Bước 4: Set lại default
ALTER TABLE "Expense" ALTER COLUMN "splitMode" SET DEFAULT 'AMOUNT';