import { z } from "zod";

export const markAsPaidSchema = z.object({
  settlementId: z.string().cuid(),
  // Không nhận participantId từ client — phải đọc từ cookie phía server
});

export type MarkAsPaidInput = z.infer<typeof markAsPaidSchema>;

export const confirmReceivedSchema = z.object({
  settlementId: z.string().cuid(),
  // Không nhận participantId từ client — phải đọc từ cookie phía server
});

export type ConfirmReceivedInput = z.infer<typeof confirmReceivedSchema>;
