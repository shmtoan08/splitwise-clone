import { z } from "zod";
import { BudgetMode } from "../../generated/prisma";

const budgetModeEnum = z.nativeEnum(BudgetMode);

export const updateParticipantBudgetsSchema = z.object({
  eventId: z.string().uuid("eventId phải là UUID hợp lệ"),
  budgets: z.array(
    z.object({
      participantId: z.string().cuid(),
      budgetMode: budgetModeEnum,
      budget: z.number().int().min(0, "Ngân sách không được âm"),
    })
  ),
});

export type UpdateParticipantBudgetsInput = z.infer<typeof updateParticipantBudgetsSchema>;

export const budgetActionSchema = z.object({
  eventId: z.string().uuid("eventId phải là UUID hợp lệ"),
});

export type BudgetActionInput = z.infer<typeof budgetActionSchema>;
