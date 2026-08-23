"use server";

// TODO: Implement expense Server Actions
// - addExpense(data): Tạo Expense + ExpenseSplit trong 1 transaction
//   Phải dùng splitEvenly/splitByShares từ utils/algorithm.ts
//   Phải validate tổng splits === expense.amount trước khi lưu
// - updateExpense(data): Update với optimistic locking (check version)
// - deleteExpense(expenseId): Xoá expense (cascade delete splits tự động)

import { prisma } from "@/lib/prisma";
import { Prisma } from "../../generated/prisma";
import { addExpenseSchema, updateExpenseSchema } from "@/schemas/expense.schema";
import { 
  splitEvenly, 
  splitByShares, 
  splitByCustomAmount, 
  validateSplitSum 
} from "@/utils/algorithm";
import type { ActionResult } from "@/types";
import { revalidatePath } from "next/cache";

import { cookies } from "next/headers";

const DEVICE_TOKEN_COOKIE = "split-app-device-token";

export async function addExpense(data: unknown): Promise<ActionResult> {
  const parsed = addExpenseSchema.safeParse(data);
  if (!parsed.success) {
    // Collect all error messages from Zod
    const errors = parsed.error.issues.map((e: any) => e.message).join(", ");
    return { success: false, error: `Dữ liệu không hợp lệ: ${errors}` };
  }

  const { eventId, title, amount, payerId, splitConfig } = parsed.data;

  try {
    // 1. Calculate splits using algorithm based on mode
    let calculatedSplits: Array<{ participantId: string; amount: number }> = [];
    let participantIds: string[] = [];

    if (splitConfig.mode === "EVEN") {
      calculatedSplits = splitEvenly(amount, splitConfig.participantIds);
      participantIds = splitConfig.participantIds;
    } else if (splitConfig.mode === "SHARES") {
      calculatedSplits = splitByShares(amount, splitConfig.splits);
      participantIds = splitConfig.splits.map((s) => s.participantId);
    } else if (splitConfig.mode === "CUSTOM") {
      calculatedSplits = splitByCustomAmount(amount, splitConfig.splits);
      participantIds = splitConfig.splits.map((s) => s.participantId);
    }

    // 2. Validate total splits match total amount precisely
    validateSplitSum(amount, calculatedSplits);

    // 3. Validate participantIds belong to event
    const uniqueParticipantIds = Array.from(new Set([payerId, ...participantIds]));
    const dbParticipants = await prisma.participant.findMany({
      where: {
        eventId,
        id: { in: uniqueParticipantIds }
      },
      select: { id: true }
    });

    if (dbParticipants.length !== uniqueParticipantIds.length) {
      return { success: false, error: "Một số thành viên không thuộc nhóm này." };
    }

    // 4. Lấy createdById từ cookie - bắt buộc phải có danh tính
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    if (!deviceToken) {
      return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };
    }

    const currentParticipant = await prisma.participant.findFirst({
      where: { eventId, deviceToken },
      select: { id: true },
    });

    if (!currentParticipant) {
      return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };
    }
    
    const createdById = currentParticipant.id;

    // 5. Create using Prisma Transaction
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          eventId,
          title,
          amount,
          payerId,
          createdById,
          version: 1, // Start with version 1
        },
      });

      const expenseSplitsData = calculatedSplits.map((split) => ({
        expenseId: expense.id,
        participantId: split.participantId,
        amount: split.amount,
      }));

      await tx.expenseSplit.createMany({
        data: expenseSplitsData,
      });
    });

    // 4. Revalidate cache
    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error: any) {
    console.error("[addExpense] error:", error);
    // Trả về error thay vì throw ra client
    return { success: false, error: "Lỗi hệ thống khi thêm chi phí. Vui lòng thử lại sau." };
  }
}

export async function updateExpense(data: unknown): Promise<ActionResult> {
  const parsed = updateExpenseSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e: any) => e.message).join(", ");
    return { success: false, error: `Dữ liệu không hợp lệ: ${errors}` };
  }

  const { id, eventId, title, amount, payerId, splitConfig, currentVersion } = parsed.data;

  try {
    // 1. Calculate splits using algorithm based on mode
    let calculatedSplits: Array<{ participantId: string; amount: number }> = [];

    if (splitConfig.mode === "EVEN") {
      calculatedSplits = splitEvenly(amount, splitConfig.participantIds);
    } else if (splitConfig.mode === "SHARES") {
      calculatedSplits = splitByShares(amount, splitConfig.splits);
    } else if (splitConfig.mode === "CUSTOM") {
      calculatedSplits = splitByCustomAmount(amount, splitConfig.splits);
    }

    // 2. Validate total splits match total amount precisely
    validateSplitSum(amount, calculatedSplits);

    // 3. Validate participantIds belong to event
    const uniqueParticipantIds = Array.from(new Set([payerId, ...calculatedSplits.map(s => s.participantId)]));
    const dbParticipants = await prisma.participant.findMany({
      where: {
        eventId,
        id: { in: uniqueParticipantIds }
      },
      select: { id: true }
    });

    if (dbParticipants.length !== uniqueParticipantIds.length) {
      return { success: false, error: "Một số thành viên không thuộc nhóm này." };
    }

    // 4. Xác nhận danh tính người sửa
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
    
    if (!deviceToken) {
      return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };
    }
    
    const currentParticipant = await prisma.participant.findFirst({
      where: { eventId, deviceToken },
      select: { id: true },
    });
    
    if (!currentParticipant) {
      return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };
    }

    // 5. Update using Prisma Transaction (Optimistic Locking)
    await prisma.$transaction(async (tx) => {
      // a. Xoá tất cả splits cũ
      await tx.expenseSplit.deleteMany({
        where: { expenseId: id },
      });

      // b. Cập nhật Expense (kèm version check)
      const updatedExpense = await tx.expense.update({
        where: {
          id,
          version: currentVersion, // Check optimistic locking
        },
        data: {
          title,
          amount,
          payerId,
          version: { increment: 1 },
        },
      });

      // c. Tạo splits mới
      const expenseSplitsData = calculatedSplits.map(split => ({
        expenseId: updatedExpense.id,
        participantId: split.participantId,
        amount: split.amount,
      }));

      await tx.expenseSplit.createMany({
        data: expenseSplitsData,
      });
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error: any) {
    console.error("[updateExpense] error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      // Record not found có thể do xoá hoặc do sai version
      return { success: false, error: "VERSION_CONFLICT" };
    }
    return { success: false, error: "Lỗi hệ thống khi cập nhật chi phí. Vui lòng thử lại sau." };
  }
}

export async function deleteExpense(expenseId: string, eventId: string): Promise<ActionResult> {
  if (!expenseId || !eventId || typeof expenseId !== "string" || typeof eventId !== "string") {
    return { success: false, error: "Dữ liệu không hợp lệ" };
  }

  try {
    // 1. Xác nhận danh tính người xoá
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
    
    if (!deviceToken) {
      return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };
    }
    
    const currentParticipant = await prisma.participant.findFirst({
      where: { eventId, deviceToken },
      select: { id: true },
    });
    
    if (!currentParticipant) {
      return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };
    }

    // 2. Xoá Expense
    await prisma.expense.delete({
      where: { id: expenseId },
    });
    
    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error: any) {
    console.error("[deleteExpense] error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "NOT_FOUND" };
    }
    return { success: false, error: "Lỗi hệ thống khi xoá chi phí. Vui lòng thử lại sau." };
  }
}
