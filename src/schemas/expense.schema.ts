import { z } from "zod";

// ---------------------------------------------------------------------------
// Split mode schemas
// ---------------------------------------------------------------------------

export const splitModeSchema = z.object({
  mode: z.enum(["AMOUNT", "SHARES"]),
  splits: z
    .array(
      z.object({
        participantId: z.string().cuid(),
        amount: z
          .number()
          .int("Số tiền phải là số nguyên")
          .min(0, "Số tiền không được âm"),
        shares: z.number().nullable().optional(),
      })
    )
    .min(1, "Vui lòng chọn ít nhất 1 thành viên"),
});

// ---------------------------------------------------------------------------
// Main expense schema
// ---------------------------------------------------------------------------

const expenseBaseSchema = z.object({
  eventId: z.string().uuid("eventId phải là UUID"),
  title: z
    .string()
    .min(1, "Tên khoản chi không được để trống")
    .max(200)
    .trim(),
  /** Int — đơn vị đồng, KHÔNG dùng Float */
  amount: z
    .number()
    .int("Số tiền phải là số nguyên (đơn vị đồng)")
    .positive("Số tiền phải lớn hơn 0"),
  payerId: z.string().cuid("payerId phải là CUID hợp lệ"),
  splitConfig: splitModeSchema,
  /** Tiền tệ gốc của khoản chi (nếu khác baseCurrency của event) */
  originalCurrency: z
    .string()
    .length(3, "Mã tiền tệ phải đúng 3 ký tự ISO 4217")
    .toUpperCase()
    .optional(),
  /**
   * Tỷ giá nhập tay (dự phòng khi API tỷ giá không khả dụng).
   * Nếu cung cấp, sẽ được ưu tiên dùng thay vì gọi API.
   */
  manualExchangeRate: z
    .number()
    .positive("Tỷ giá phải lớn hơn 0")
    .optional(),
  expenseDate: z.coerce.date().optional(),
  receiptUrl: z.string().url().optional().nullable(),
  /** Số tiền dôi ra khi chia theo ROUND_UP */
  surplus: z.number().int().min(0).default(0).optional(),
});

export const addExpenseSchema = expenseBaseSchema.refine(
  (data) => {
    const sum = data.splitConfig.splits.reduce((acc, split) => acc + split.amount, 0);
    return sum === data.amount + (data.surplus || 0);
  },
  {
    message: "Tổng số tiền chia chi tiết không khớp với tổng khoản chi (+ tiền dư).",
    path: ["splitConfig"],
  }
);

export type AddExpenseInput = z.infer<typeof addExpenseSchema>;

export const updateExpenseSchema = expenseBaseSchema
  .extend({
    id: z.string().cuid(),
    /** Bắt buộc để thực hiện optimistic locking */
    currentVersion: z.number().int().min(0),
  })
  .refine(
    (data) => {
      const sum = data.splitConfig.splits.reduce((acc, split) => acc + split.amount, 0);
      return sum === data.amount + (data.surplus || 0);
    },
    {
      message: "Tổng số tiền chia chi tiết không khớp với tổng khoản chi (+ tiền dư).",
      path: ["splitConfig"],
    }
  );

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
