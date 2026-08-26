"use server";

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
import { getExchangeRate, ExchangeRateError } from "@/lib/exchangeRate";

const DEVICE_TOKEN_COOKIE = "split-app-device-token";

/** Lấy tỷ giá: ưu tiên manualExchangeRate → fallback gọi API */
async function resolveExchangeRate(
  originalCurrency: string | undefined,
  baseCurrency: string,
  manualRate: number | undefined
): Promise<{ rate: number; needsManualRate: false } | { rate: null; needsManualRate: true; message: string }> {
  if (!originalCurrency || originalCurrency === baseCurrency) {
    return { rate: 1, needsManualRate: false };
  }

  // Ưu tiên rate nhập tay (dự phòng khi API down)
  if (manualRate !== undefined && manualRate > 0) {
    return { rate: manualRate, needsManualRate: false };
  }

  try {
    const rate = await getExchangeRate(originalCurrency, baseCurrency);
    return { rate, needsManualRate: false };
  } catch (err) {
    const message = err instanceof ExchangeRateError
      ? err.message
      : "Không lấy được tỷ giá. Vui lòng nhập thủ công.";
    return { rate: null, needsManualRate: true, message };
  }
}

export async function addExpense(data: unknown): Promise<ActionResult> {
  const parsed = addExpenseSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e: any) => e.message).join(", ");
    return { success: false, error: `Dữ liệu không hợp lệ: ${errors}` };
  }

  const { eventId, title, amount, payerId, splitConfig, originalCurrency, manualExchangeRate, expenseDate } = parsed.data;

  try {
    // 1. Lấy baseCurrency của event
    const eventRecord = await prisma.event.findUnique({
      where: { id: eventId },
      select: { baseCurrency: true },
    });
    if (!eventRecord) {
      return { success: false, error: "Sự kiện không tồn tại." };
    }
    const baseCurrency = eventRecord.baseCurrency;

    // 2. Resolve tỷ giá nếu có originalCurrency
    let snapshotRate: number | null = null;
    let finalAmount = amount; // amount đã là số đồng baseCurrency

    if (originalCurrency && originalCurrency !== baseCurrency) {
      const resolved = await resolveExchangeRate(originalCurrency, baseCurrency, manualExchangeRate);
      if (resolved.needsManualRate) {
        return { success: false, error: `EXCHANGE_RATE_UNAVAILABLE:${resolved.message}` };
      }
      snapshotRate = resolved.rate;
      // amount trong payload là số nguyên tính theo originalCurrency → quy đổi sang baseCurrency
      finalAmount = Math.round(amount * snapshotRate);
    }

    // 3. Tính splits dựa trên finalAmount
    let calculatedSplits: Array<{ participantId: string; amount: number }> = [];
    let participantIds: string[] = [];

    if (splitConfig.mode === "EVEN") {
      calculatedSplits = splitEvenly(finalAmount, splitConfig.participantIds);
      participantIds = splitConfig.participantIds;
    } else if (splitConfig.mode === "SHARES") {
      calculatedSplits = splitByShares(finalAmount, splitConfig.splits);
      participantIds = splitConfig.splits.map((s) => s.participantId);
    } else if (splitConfig.mode === "CUSTOM") {
      calculatedSplits = splitByCustomAmount(finalAmount, splitConfig.splits);
      participantIds = splitConfig.splits.map((s) => s.participantId);
    }

    validateSplitSum(finalAmount, calculatedSplits);

    // 4. Validate participants thuộc event
    const uniqueParticipantIds = Array.from(new Set([payerId, ...participantIds]));
    const dbParticipants = await prisma.participant.findMany({
      where: { eventId, id: { in: uniqueParticipantIds } },
      select: { id: true },
    });

    if (dbParticipants.length !== uniqueParticipantIds.length) {
      return { success: false, error: "Một số thành viên không thuộc nhóm này." };
    }

    // 5. Lấy createdById từ cookie
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

    // 6. Tạo Expense + Splits trong transaction
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          eventId,
          title,
          amount: finalAmount,
          payerId,
          createdById,
          version: 1,
          originalCurrency: originalCurrency ?? null,
          // Dùng Prisma.Decimal để tránh Float precision
          exchangeRate: snapshotRate !== null ? new Prisma.Decimal(snapshotRate) : null,
          isCrossSubsidy: false,
          expenseDate: expenseDate ?? new Date(),
          splitMode: splitConfig.mode as any,
        },
      });

      await tx.expenseSplit.createMany({
        data: calculatedSplits.map((split) => ({
          expenseId: expense.id,
          participantId: split.participantId,
          amount: split.amount,
        })),
      });
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error: any) {
    console.error("[addExpense] error:", error);
    return { success: false, error: "Lỗi hệ thống khi thêm chi phí. Vui lòng thử lại sau." };
  }
}

export async function updateExpense(data: unknown): Promise<ActionResult> {
  const parsed = updateExpenseSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e: any) => e.message).join(", ");
    return { success: false, error: `Dữ liệu không hợp lệ: ${errors}` };
  }

  const { id, eventId, title, amount, payerId, splitConfig, currentVersion, originalCurrency, manualExchangeRate, expenseDate } = parsed.data;

  try {
    // 1. Lấy bản ghi expense cũ (để kiểm tra originalCurrency đã lưu)
    const [eventRecord, existingExpense] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId }, select: { baseCurrency: true } }),
      prisma.expense.findUnique({ where: { id }, select: { originalCurrency: true, exchangeRate: true } }),
    ]);

    if (!eventRecord) return { success: false, error: "Sự kiện không tồn tại." };
    if (!existingExpense) return { success: false, error: "Khoản chi không tồn tại." };

    const baseCurrency = eventRecord.baseCurrency;

    // 2. Resolve tỷ giá
    // Nếu originalCurrency không đổi → GIỮ NGUYÊN exchangeRate đã snapshot, không gọi lại API
    let snapshotRate: Prisma.Decimal | null = existingExpense.exchangeRate;
    let finalAmount = amount;

    const currencyChanged = originalCurrency !== (existingExpense.originalCurrency ?? undefined);

    if (originalCurrency && originalCurrency !== baseCurrency) {
      if (currencyChanged) {
        // originalCurrency bị đổi → cần lấy tỷ giá mới
        const resolved = await resolveExchangeRate(originalCurrency, baseCurrency, manualExchangeRate);
        if (resolved.needsManualRate) {
          return { success: false, error: `EXCHANGE_RATE_UNAVAILABLE:${resolved.message}` };
        }
        snapshotRate = new Prisma.Decimal(resolved.rate);
        finalAmount = Math.round(amount * resolved.rate);
      } else {
        // Giữ nguyên exchangeRate — chỉ tính lại amount theo rate cũ
        const rate = existingExpense.exchangeRate?.toNumber() ?? 1;
        finalAmount = Math.round(amount * rate);
      }
    } else {
      // Không có originalCurrency hoặc giống baseCurrency
      snapshotRate = null;
    }

    // 3. Tính splits
    let calculatedSplits: Array<{ participantId: string; amount: number }> = [];

    if (splitConfig.mode === "EVEN") {
      calculatedSplits = splitEvenly(finalAmount, splitConfig.participantIds);
    } else if (splitConfig.mode === "SHARES") {
      calculatedSplits = splitByShares(finalAmount, splitConfig.splits);
    } else if (splitConfig.mode === "CUSTOM") {
      calculatedSplits = splitByCustomAmount(finalAmount, splitConfig.splits);
    }

    validateSplitSum(finalAmount, calculatedSplits);

    // 4. Validate participants
    const uniqueParticipantIds = Array.from(new Set([payerId, ...calculatedSplits.map(s => s.participantId)]));
    const dbParticipants = await prisma.participant.findMany({
      where: { eventId, id: { in: uniqueParticipantIds } },
      select: { id: true },
    });

    if (dbParticipants.length !== uniqueParticipantIds.length) {
      return { success: false, error: "Một số thành viên không thuộc nhóm này." };
    }

    // 5. Xác nhận danh tính
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
    if (!deviceToken) return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };

    const currentParticipant = await prisma.participant.findFirst({
      where: { eventId, deviceToken },
      select: { id: true },
    });
    if (!currentParticipant) return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };

    // 6. Update trong transaction (Optimistic Locking)
    await prisma.$transaction(async (tx) => {
      await tx.expenseSplit.deleteMany({ where: { expenseId: id } });

      const updatedExpense = await tx.expense.update({
        where: { id, version: currentVersion },
        data: {
          title,
          amount: finalAmount,
          payerId,
          version: { increment: 1 },
          originalCurrency: originalCurrency ?? null,
          exchangeRate: snapshotRate,
          expenseDate: expenseDate ?? new Date(),
          splitMode: splitConfig.mode as any,
        },
      });

      await tx.expenseSplit.createMany({
        data: calculatedSplits.map(split => ({
          expenseId: updatedExpense.id,
          participantId: split.participantId,
          amount: split.amount,
        })),
      });
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error: any) {
    console.error("[updateExpense] error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
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
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
    if (!deviceToken) return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };

    const currentParticipant = await prisma.participant.findFirst({
      where: { eventId, deviceToken },
      select: { id: true },
    });
    if (!currentParticipant) return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };

    await prisma.expense.delete({ where: { id: expenseId } });

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
