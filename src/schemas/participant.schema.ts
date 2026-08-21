import { z } from "zod";

export const addParticipantSchema = z.object({
  eventId: z.string().uuid(),
  name: z
    .string()
    .min(1, "Tên thành viên không được để trống")
    .max(50, "Tên tối đa 50 ký tự")
    .trim(),
});

export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

export const claimIdentitySchema = z.object({
  participantId: z.string().cuid(),
  eventId: z.string().uuid(),
  // deviceToken KHÔNG validate ở đây — phải đọc từ httpOnly cookie phía server
});

export type ClaimIdentityInput = z.infer<typeof claimIdentitySchema>;

export const updatePaymentInfoSchema = z.object({
  participantId: z.string().cuid(),
  /** Thông tin thanh toán dạng JSON string (STK + bankId, hoặc PayPay ID) */
  paymentInfo: z.string().max(500).nullable(),
});

export type UpdatePaymentInfoInput = z.infer<typeof updatePaymentInfoSchema>;
