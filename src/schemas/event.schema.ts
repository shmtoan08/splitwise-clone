import { z } from "zod";

export const createEventSchema = z.object({
  title: z
    .string()
    .min(1, "Tên nhóm không được để trống")
    .max(100, "Tên nhóm tối đa 100 ký tự")
    .trim(),
  currency: z
    .string()
    .length(3, "Currency phải là mã ISO 4217 3 ký tự")
    .default("VND"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.extend({
  id: z.string().cuid(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;
