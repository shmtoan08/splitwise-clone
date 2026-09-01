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
  roundingMode: z
    .enum(["ROUND_ROBIN", "ROUND_UP"])
    .default("ROUND_ROBIN")
    .optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.extend({
  id: z.string().cuid(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/** Schema cho action đổi baseCurrency của Event */
export const updateEventCurrencySchema = z.object({
  eventId: z.string().uuid("eventId phải là UUID"),
  baseCurrency: z
    .string()
    .length(3, "Mã tiền tệ phải gồm đúng 3 ký tự ISO 4217")
    .toUpperCase(),
});

export type UpdateEventCurrencyInput = z.infer<typeof updateEventCurrencySchema>;

/** Schema cho action đổi roundingMode của Event */
export const updateEventRoundingModeSchema = z.object({
  eventId: z.string().uuid("eventId phải là UUID"),
  roundingMode: z.enum(["ROUND_ROBIN", "ROUND_UP"]),
});

export type UpdateEventRoundingModeInput = z.infer<typeof updateEventRoundingModeSchema>;
