import { z } from "zod";

export const addParticipantSchema = z.object({
  eventId: z.string().uuid(),
  name: z
    .string()
    .min(1, "Tên thành viên không được để trống")
    .max(50, "Tên tối đa 50 ký tự")
    .trim(),
  isSelf: z.boolean().default(false).optional(),
});

export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

export const claimIdentitySchema = z.object({
  participantId: z.string().cuid(),
  eventId: z.string().uuid(),
  passcode: z.string().optional(),
});

export type ClaimIdentityInput = z.infer<typeof claimIdentitySchema>;

export const claimCreatorIdentitySchema = z.object({
  participantId: z.string().cuid(),
  eventId: z.string().uuid(),
  passcode: z
    .string()
    .min(1, "Vui lòng nhập mã PIN")
    .regex(/^\d{4,6}$/, "Mã PIN phải gồm 4 đến 6 chữ số"),
});

export type ClaimCreatorIdentityInput = z.infer<typeof claimCreatorIdentitySchema>;


export const PaymentInfoSchema = z.object({
  bankBIN: z.string().min(1).max(100).optional().nullable(),
  accountNumber: z.string().min(1).max(50).optional().nullable(),
  accountName: z.string().min(1).max(100).optional().nullable(),
  paypayLink: z.string().url().max(200).optional().nullable(),
}).refine(
  (data) => {
    const hasBank = !!data.bankBIN || !!data.accountNumber || !!data.accountName;
    if (hasBank) {
      return !!data.bankBIN && !!data.accountNumber && !!data.accountName;
    }
    return true;
  },
  {
    message: "Vui lòng nhập đủ Ngân hàng, Số tài khoản và Tên chủ tài khoản",
    path: ["bankBIN"], // Assign error to bankBIN field generically
  }
);

export type PaymentInfoInput = z.infer<typeof PaymentInfoSchema>;

export const updatePaymentInfoSchema = z.object({
  participantId: z.string().cuid(),
  paymentInfo: PaymentInfoSchema,
});

export type UpdatePaymentInfoInput = z.infer<typeof updatePaymentInfoSchema>;

export const updateFamilyConfigSchema = z.object({
  participantId: z.string().cuid(),
  eventId: z.string().uuid(),
  familyConfig: z.object({
    adults: z.number().int().min(1, "Phải có ít nhất 1 người lớn"),
    children: z.array(z.number().gt(0).lte(1, "Hệ số trẻ em không được quá 1")),
  }),
});

export type UpdateFamilyConfigInput = z.infer<typeof updateFamilyConfigSchema>;
