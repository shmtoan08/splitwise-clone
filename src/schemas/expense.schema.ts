import { z } from "zod";

// ---------------------------------------------------------------------------
// Split mode schemas
// ---------------------------------------------------------------------------

/** Chia đều — chỉ cần biết ai tham gia */
export const evenSplitSchema = z.object({
  mode: z.literal("EVEN"),
  participantIds: z
    .array(z.string().cuid())
    .min(1, "Phải có ít nhất 1 người tham gia chia"),
});

/** Chia theo số tiền cụ thể */
export const customAmountSplitSchema = z.object({
  mode: z.literal("CUSTOM"),
  splits: z
    .array(
      z.object({
        participantId: z.string().cuid(),
        amount: z
          .number()
          .int("Số tiền phải là số nguyên")
          .min(0, "Số tiền không được âm"),
      })
    )
    .min(1),
});

/** Chia theo tỷ lệ (shares) */
export const sharesSplitSchema = z.object({
  mode: z.literal("SHARES"),
  splits: z
    .array(
      z.object({
        participantId: z.string().cuid(),
        shares: z
          .number()
          .int("Số phần phải là số nguyên")
          .positive("Số phần phải lớn hơn 0"),
      })
    )
    .min(1),
});

export const splitModeSchema = z.discriminatedUnion("mode", [
  evenSplitSchema,
  customAmountSplitSchema,
  sharesSplitSchema,
]);

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
});

export const addExpenseSchema = expenseBaseSchema.refine(
  (data) => {
    if (data.splitConfig.mode === "CUSTOM") {
      const sum = data.splitConfig.splits.reduce((acc, split) => acc + split.amount, 0);
      return sum === data.amount;
    }
    return true;
  },
  {
    message: "Tổng số tiền chia chi tiết không khớp với tổng khoản chi.",
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
      if (data.splitConfig.mode === "CUSTOM") {
        const sum = data.splitConfig.splits.reduce((acc, split) => acc + split.amount, 0);
        return sum === data.amount;
      }
      return true;
    },
    {
      message: "Tổng số tiền chia chi tiết không khớp với tổng khoản chi.",
      path: ["splitConfig"],
    }
  );

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
