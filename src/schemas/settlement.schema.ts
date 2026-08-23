import { z } from "zod";

export const MarkAsPaidSchema = z.object({
  eventId: z.string().uuid("eventId phải là UUID hợp lệ"),
  fromId: z.string().cuid("fromId phải là CUID hợp lệ"),
  toId: z.string().cuid("toId phải là CUID hợp lệ"),
  amount: z
    .number()
    .int("Số tiền phải là số nguyên")
    .positive("Số tiền phải lớn hơn 0"),
});

export const ConfirmReceivedSchema = z.object({
  settlementId: z.string().cuid("settlementId phải là CUID hợp lệ"),
});
