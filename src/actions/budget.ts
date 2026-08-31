"use server";

import { prisma } from "@/lib/prisma";
import { updateParticipantBudgetsSchema, budgetActionSchema } from "@/schemas/budget.schema";
import type { ActionResult } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod"; // Thêm Zod để validate mảng subsidies truyền từ UI

const FUND_PARTICIPANT_NAME = "🏢 Quỹ Công ty";

export async function updateParticipantBudgets(data: unknown): Promise<ActionResult<{ success: boolean }>> {
  const parsed = updateParticipantBudgetsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { eventId, budgets, avgBudget } = parsed.data;

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLocked: true },
    });
    if (event?.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa." };
    }

    await prisma.$transaction(async (tx) => {
      // 0. Cập nhật avgBudget cho sự kiện
      if (avgBudget !== undefined) {
        await tx.event.update({
          where: { id: eventId },
          data: { avgBudget },
        });
      }
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
  budgetA: number | null;
  spentB: number;
  overC: number;
  surplusD: number;
  receivedSubsidyE: number;
  selfFundF: number;
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

// ----------------------------------------------------------------------
// CẬP NHẬT MỚI: Nhận trực tiếp mảng subsidies từ giao diện truyền xuống
// ----------------------------------------------------------------------
const applySubsidyClientSchema = z.object({
  eventId: z.string(),
  title: z.string().default("Bù đắp ngân sách tự động"),
  subsidies: z.array(
    z.object({
      participantId: z.string(),
      amount: z.number(),
    })
  ),
});

export async function applyCrossSubsidy(data: unknown): Promise<ActionResult<{ message?: string }>> {
  // Thay vì dùng budgetActionSchema, ta dùng schema mới để lấy được mảng subsidies
  const parsed = applySubsidyClientSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Dữ liệu gửi lên không hợp lệ." };
  }

  const { eventId, title, subsidies } = parsed.data;

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLocked: true },
    });
    if (event?.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Xóa toàn bộ hóa đơn bù đắp chéo cũ
      await tx.expense.deleteMany({
        where: { eventId, isCrossSubsidy: true },
      });

      // 2. Nếu mảng rỗng (người dùng tắt chế độ bù đắp), việc xóa ở trên là đủ.
      if (subsidies.length === 0) return;

      // 3. Tìm hoặc tạo Participant "🏢 Quỹ Công ty"
      let fundParticipant = await tx.participant.findFirst({
        where: { eventId, name: FUND_PARTICIPANT_NAME },
        select: { id: true },
      });

      if (!fundParticipant) {
        fundParticipant = await tx.participant.create({
          data: { 
            eventId, 
            name: FUND_PARTICIPANT_NAME, 
            budgetMode: "UNLIMITED",
            deviceToken: null 
          },
          select: { id: true },
        });
      }

      // 4. Lấy tổng số tiền bù đắp từ các khoản người dùng đồng ý
      const totalAmount = subsidies.reduce((sum, s) => sum + s.amount, 0);

      // 5. Tạo khoản chi bù đắp mới
      await tx.expense.create({
        data: {
          eventId,
          title,
          amount: totalAmount,
          payerId: fundParticipant.id,
          isCrossSubsidy: true,
          splitMode: "AMOUNT",
          version: 1,
          splits: {
            create: subsidies.map((s) => ({
              participantId: s.participantId,
              amount: s.amount,
            })),
          },
        },
      });
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: { message: "Đã áp dụng bù đắp chéo thành công!" } };
  } catch (error) {
    console.error("[applyCrossSubsidy] error:", error);
    return { success: false, error: "Lỗi hệ thống khi lưu bù đắp ngân sách." };
  }
}

export async function removeCrossSubsidy(data: unknown): Promise<ActionResult<{ success: boolean }>> {
  const parsed = budgetActionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { eventId } = parsed.data;

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLocked: true },
    });
    if (event?.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa." };
    }

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