"use server";

import { prisma } from "@/lib/prisma";
import { updateParticipantBudgetsSchema, budgetActionSchema } from "@/schemas/budget.schema";
import type { ActionResult } from "@/types";
import { revalidatePath } from "next/cache";

const FUND_PARTICIPANT_NAME = "🏢 Quỹ Công ty";

export async function updateParticipantBudgets(data: unknown): Promise<ActionResult<{ success: boolean }>> {
  const parsed = updateParticipantBudgetsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { eventId, budgets } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Cập nhật từng participant
      for (const b of budgets) {
        // Ép budget = 0 nếu không phải FIXED
        const finalBudget = b.budgetMode === "FIXED" ? b.budget : 0;
        await tx.participant.update({
          where: { id: b.participantId, eventId },
          data: { budgetMode: b.budgetMode, budget: finalBudget },
        });
      }

      // 2. Xóa cross-subsidy cũ vì cấu hình đã đổi
      await tx.expense.deleteMany({
        where: { eventId, isCrossSubsidy: true },
      });
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("[updateParticipantBudgets] error:", error);
    return { success: false, error: "Lỗi hệ thống khi lưu ngân sách." };
  }
}

export type BudgetStatRow = {
  participantId: string;
  name: string;
  budgetMode: "FIXED" | "UNLIMITED" | "SELF_FUNDED";
  // A = budget (hoặc null nếu không phải FIXED)
  budgetA: number | null;
  // B = actualSpent
  spentB: number;
  // C = Lố
  overC: number;
  // D = Dư
  surplusD: number;
  // E = Nhận bù đắp
  receivedSubsidyE: number;
  // F = Tự bù thêm
  selfFundF: number;
  // G = Công ty chi trả
  companyPaidG: number;
};

export async function getBudgetStats(eventId: string): Promise<ActionResult<{ stats: BudgetStatRow[], hasCrossSubsidyApplied: boolean }>> {
  try {
    const [participants, expenses, crossExpense] = await Promise.all([
      prisma.participant.findMany({
        where: { eventId, name: { not: FUND_PARTICIPANT_NAME } },
      }),
      prisma.expense.findMany({
        where: { eventId, isCrossSubsidy: false },
        select: { splits: { select: { participantId: true, amount: true } } },
      }),
      prisma.expense.findFirst({
        where: { eventId, isCrossSubsidy: true },
        select: { splits: { select: { participantId: true, amount: true } } },
      }),
    ]);

    const hasCrossSubsidyApplied = !!crossExpense;

    // Tính B: actualSpent
    const spendingMap = new Map<string, number>();
    for (const p of participants) spendingMap.set(p.id, 0);

    for (const exp of expenses) {
      for (const split of exp.splits) {
        if (spendingMap.has(split.participantId)) {
          spendingMap.set(split.participantId, spendingMap.get(split.participantId)! + split.amount);
        }
      }
    }

    // Lấy E từ crossExpense (nếu có)
    const subsidyMap = new Map<string, number>();
    if (crossExpense) {
      for (const split of crossExpense.splits) {
        subsidyMap.set(split.participantId, split.amount);
      }
    }

    const stats: BudgetStatRow[] = participants.map((p) => {
      const B = spendingMap.get(p.id) ?? 0;
      let A: number | null = null;
      let C = 0;
      let D = 0;
      let E = subsidyMap.get(p.id) ?? 0;
      let F = 0;
      let G = 0;

      if (p.budgetMode === "UNLIMITED") {
        F = 0;
        G = B;
      } else if (p.budgetMode === "SELF_FUNDED") {
        F = B;
        G = 0;
      } else { // FIXED
        A = p.budget;
        if (B > A) {
          C = B - A;
          F = C - E;
          G = A + E;
        } else {
          D = A - B;
          F = 0;
          G = B;
        }
      }

      return {
        participantId: p.id,
        name: p.name,
        budgetMode: p.budgetMode,
        budgetA: A,
        spentB: B,
        overC: C,
        surplusD: D,
        receivedSubsidyE: E,
        selfFundF: F,
        companyPaidG: G,
      };
    });

    return { success: true, data: { stats, hasCrossSubsidyApplied } };
  } catch (error) {
    console.error("[getBudgetStats] error:", error);
    return { success: false, error: "Lỗi hệ thống khi tải thống kê ngân sách." };
  }
}

export async function applyCrossSubsidy(data: unknown): Promise<ActionResult<{ message?: string }>> {
  const parsed = budgetActionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { eventId } = parsed.data;

  try {
    const statsResult = await getBudgetStats(eventId);
    if (!statsResult.success) throw new Error(statsResult.error);
    
    const { stats } = statsResult.data;

    // 1. Lọc chỉ FIXED
    const fixedStats = stats.filter(s => s.budgetMode === "FIXED");
    
    // 2. Xác định tổng lố (ΣO) và tổng dư (T_dư)
    const overList = fixedStats.filter(s => s.overC > 0);
    const totalOver = overList.reduce((sum, s) => sum + s.overC, 0); // ΣO
    const totalSurplus = fixedStats.reduce((sum, s) => sum + s.surplusD, 0); // T_dư

    // 4. Rẽ nhánh
    if (totalOver === 0) {
      return { success: false, error: "Không có ai thuộc chế độ Cố định bị vượt ngân sách, không cần bù đắp." };
    }
    if (totalSurplus <= 0) {
      return { success: false, error: "Ngân sách nhóm không đủ để bù đắp." };
    }

    // 5. Tính S_i với last-item correction
    const subsidyAmounts: { participantId: string; amount: number }[] = [];
    let runningTotal = 0;

    overList.forEach((entry, idx) => {
      const isLast = idx === overList.length - 1;
      let s: number;
      if (isLast) {
        s = totalSurplus - runningTotal;
      } else {
        s = Math.round(totalSurplus * (entry.overC / totalOver));
        runningTotal += s;
      }
      subsidyAmounts.push({ participantId: entry.participantId, amount: s });
    });

    // 7. Upsert Participant "🏢 Quỹ Công ty"
    let fundParticipant = await prisma.participant.findFirst({
      where: { eventId, name: FUND_PARTICIPANT_NAME },
      select: { id: true },
    });

    if (!fundParticipant) {
      fundParticipant = await prisma.participant.create({
        data: { eventId, name: FUND_PARTICIPANT_NAME, deviceToken: null },
        select: { id: true },
      });
    }

    // 8 & 9. Transaction xoá cũ tạo mới
    await prisma.$transaction(async (tx) => {
      await tx.expense.deleteMany({
        where: { eventId, isCrossSubsidy: true },
      });

      const crossExpense = await tx.expense.create({
        data: {
          eventId,
          title: "Bù đắp ngân sách tự động — không phải khoản chi thực tế",
          amount: totalSurplus,
          payerId: fundParticipant.id,
          isCrossSubsidy: true,
          version: 1,
        },
      });

      await tx.expenseSplit.createMany({
        data: subsidyAmounts.map((s) => ({
          expenseId: crossExpense.id,
          participantId: s.participantId,
          amount: s.amount,
        })),
      });
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: { message: "Đã áp dụng bù đắp chéo thành công!" } };
  } catch (error) {
    console.error("[applyCrossSubsidy] error:", error);
    return { success: false, error: "Lỗi hệ thống khi tính bù đắp ngân sách." };
  }
}

export async function removeCrossSubsidy(data: unknown): Promise<ActionResult<{ success: boolean }>> {
  const parsed = budgetActionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { eventId } = parsed.data;

  try {
    await prisma.expense.deleteMany({
      where: { eventId, isCrossSubsidy: true },
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("[removeCrossSubsidy] error:", error);
    return { success: false, error: "Lỗi hệ thống khi huỷ bù đắp." };
  }
}
