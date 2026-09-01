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
import { v2 as cloudinary } from "cloudinary";

// Cấu hình Cloudinary SDK ở Server (dùng API Secret an toàn)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

/**
 * Hàm trích xuất public_id từ Cloudinary URL
 * Ví dụ: https://res.cloudinary.com/cloud/image/upload/v123456/split_app/events/e1/abc.jpg
 * => public_id: "split_app/events/e1/abc"
 */
function getPublicIdFromUrl(url: string): string | null {
  try {
    const regex = /\/v\d+\/(.+?)\.[a-zA-Z0-9]+(?:[?#].*)?$/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function deleteReceiptFromCloudinary(receiptUrl: string) {
  if (!receiptUrl) return { success: true };

  const publicId = getPublicIdFromUrl(receiptUrl);
  if (!publicId) {
    return { success: false, error: "URL hóa đơn không hợp lệ" };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok" || result.result === "not_found") {
      return { success: true };
    }
    return { success: false, error: result.result };
  } catch (error: any) {
    console.error("Lỗi xóa ảnh trên Cloudinary:", error);
    return { success: false, error: error.message || "Xóa ảnh thất bại" };
  }
}

export async function addExpense(data: unknown): Promise<ActionResult> {
  const parsed = addExpenseSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e: any) => e.message).join(", ");
    return { success: false, error: `Dữ liệu không hợp lệ: ${errors}` };
  }

  const { eventId, title, amount, payerId, splitConfig, originalCurrency, manualExchangeRate, expenseDate, receiptUrl, surplus: inputSurplus } = parsed.data;

  try {
    // 1. Lấy baseCurrency & roundingMode của event
    const eventRecord = await prisma.event.findUnique({
      where: { id: eventId },
      select: { baseCurrency: true, isLocked: true, roundingMode: true },
    });
    if (!eventRecord) {
      return { success: false, error: "Sự kiện không tồn tại." };
    }
    if (eventRecord.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa, không thể thêm chi tiêu mới." };
    }
    const baseCurrency = eventRecord.baseCurrency;
    const roundingMode = eventRecord.roundingMode;

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

    // 3. Lấy thông tin participants (để lấy remainderBurden cho thuật toán ROUND_ROBIN)
    const rawParticipantIds = splitConfig.splits.map((s) => s.participantId);
    const uniqueParticipantIds = Array.from(new Set([payerId, ...rawParticipantIds]));
    const dbParticipants = await prisma.participant.findMany({
      where: { eventId, id: { in: uniqueParticipantIds } },
      select: { id: true, remainderBurden: true },
    });

    if (dbParticipants.length !== uniqueParticipantIds.length) {
      return { success: false, error: "Một số thành viên không thuộc nhóm này." };
    }

    const burdenMap = new Map(dbParticipants.map((p) => [p.id, p.remainderBurden]));

    // 4. Tính splits & surplus dựa trên finalAmount và roundingMode
    let calculatedSplits: Array<{ participantId: string; amount: number; shares: number | null; isExtra?: boolean }> = [];
    let calculatedSurplus = 0;
    let extraParticipantIds: string[] = [];

    if (splitConfig.mode === "AMOUNT") {
      calculatedSplits = splitConfig.splits.map((s) => ({
        participantId: s.participantId,
        amount: Math.round(s.amount * (snapshotRate || 1)),
        shares: null,
      }));
      calculatedSurplus = inputSurplus ?? 0;
    } else if (splitConfig.mode === "SHARES") {
      const shareInputs = splitConfig.splits.map((s) => ({
        participantId: s.participantId,
        shares: s.shares as number,
        remainderBurden: burdenMap.get(s.participantId) ?? 0,
      }));

      const rawResults = splitByShares(finalAmount, shareInputs, roundingMode);
      calculatedSplits = rawResults.splits.map((r) => ({
        ...r,
        shares: splitConfig.splits.find((s) => s.participantId === r.participantId)?.shares ?? null,
      }));
      calculatedSurplus = rawResults.surplus;
      extraParticipantIds = rawResults.splits.filter((s) => s.isExtra).map((s) => s.participantId);
    }

    validateSplitSum(finalAmount, calculatedSplits, calculatedSurplus);

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

    let createdExpenseId: string | null = null;

    // 6. Tạo Expense + Splits + Cập nhật remainderBurden trong transaction
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
          exchangeRate: snapshotRate !== null ? new Prisma.Decimal(snapshotRate) : null,
          isCrossSubsidy: false,
          expenseDate: expenseDate ?? new Date(),
          splitMode: splitConfig.mode as any,
          receiptUrl: receiptUrl ?? null,
          surplus: calculatedSurplus,
        },
      });
      createdExpenseId = expense.id;

      await tx.expenseSplit.createMany({
        data: calculatedSplits.map((split) => ({
          expenseId: expense.id,
          participantId: split.participantId,
          amount: split.amount,
          shares: (split as any).shares ?? null,
        })),
      });

      // Nếu chia theo ROUND_ROBIN, ghi nhận tăng remainderBurden cho những người vừa gánh +1
      if (roundingMode === "ROUND_ROBIN" && extraParticipantIds.length > 0) {
        await tx.participant.updateMany({
          where: { id: { in: extraParticipantIds } },
          data: { remainderBurden: { increment: 1 } },
        });
      }
    });

    if (createdExpenseId && receiptUrl && receiptUrl.includes("expense_tmp_")) {
      const oldPublicId = getPublicIdFromUrl(receiptUrl);
      if (oldPublicId) {
        const newPublicId = `split_app/events/${eventId}/expense_${createdExpenseId}`;
        try {
          const renameRes = await cloudinary.uploader.rename(oldPublicId, newPublicId, { overwrite: true });
          const freshUrl = `${renameRes.secure_url}?t=${Date.now()}`;
          await prisma.expense.update({
            where: { id: createdExpenseId },
            data: { receiptUrl: freshUrl },
          });
        } catch (err) {
          console.error("Lỗi rename cloudinary:", err);
        }
      }
    }

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

  const { id, eventId, title, amount, payerId, splitConfig, currentVersion, originalCurrency, manualExchangeRate, expenseDate, receiptUrl, surplus: inputSurplus } = parsed.data;

  try {
    // 1. Lấy bản ghi expense cũ (để kiểm tra originalCurrency đã lưu và receiptUrl)
    const [eventRecord, existingExpense] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId }, select: { baseCurrency: true, isLocked: true, creatorDeviceToken: true, roundingMode: true } }),
      prisma.expense.findUnique({ where: { id }, select: { originalCurrency: true, exchangeRate: true, receiptUrl: true, createdById: true, payerId: true, surplus: true } }),
    ]);

    if (!eventRecord) return { success: false, error: "Sự kiện không tồn tại." };
    if (eventRecord.isLocked) return { success: false, error: "Sự kiện đã bị khóa, không thể chỉnh sửa chi tiêu." };
    if (!existingExpense) return { success: false, error: "Khoản chi không tồn tại." };

    const baseCurrency = eventRecord.baseCurrency;
    const roundingMode = eventRecord.roundingMode;

    // 2. Resolve tỷ giá
    let snapshotRate: Prisma.Decimal | null = existingExpense.exchangeRate;
    let finalAmount = amount;

    const currencyChanged = originalCurrency !== (existingExpense.originalCurrency ?? undefined);

    if (originalCurrency && originalCurrency !== baseCurrency) {
      if (currencyChanged) {
        const resolved = await resolveExchangeRate(originalCurrency, baseCurrency, manualExchangeRate);
        if (resolved.needsManualRate) {
          return { success: false, error: `EXCHANGE_RATE_UNAVAILABLE:${resolved.message}` };
        }
        snapshotRate = new Prisma.Decimal(resolved.rate);
        finalAmount = Math.round(amount * resolved.rate);
      } else {
        const rate = existingExpense.exchangeRate?.toNumber() ?? 1;
        finalAmount = Math.round(amount * rate);
      }
    } else {
      snapshotRate = null;
    }

    // 3. Validate participants & lấy remainderBurden
    const rawParticipantIds = splitConfig.splits.map((s) => s.participantId);
    const uniqueParticipantIds = Array.from(new Set([payerId, ...rawParticipantIds]));
    const dbParticipants = await prisma.participant.findMany({
      where: { eventId, id: { in: uniqueParticipantIds } },
      select: { id: true, remainderBurden: true },
    });

    if (dbParticipants.length !== uniqueParticipantIds.length) {
      return { success: false, error: "Một số thành viên không thuộc nhóm này." };
    }

    const burdenMap = new Map(dbParticipants.map((p) => [p.id, p.remainderBurden]));

    // 4. Tính splits & surplus
    let calculatedSplits: Array<{ participantId: string; amount: number; shares: number | null }> = [];
    let calculatedSurplus = 0;

    if (splitConfig.mode === "AMOUNT") {
      const rate = snapshotRate ? snapshotRate.toNumber() : (existingExpense.exchangeRate?.toNumber() ?? 1);
      calculatedSplits = splitConfig.splits.map((s) => ({
        participantId: s.participantId,
        amount: Math.round(s.amount * rate),
        shares: null,
      }));
      calculatedSurplus = inputSurplus ?? 0;
    } else if (splitConfig.mode === "SHARES") {
      const shareInputs = splitConfig.splits.map((s) => ({
        participantId: s.participantId,
        shares: s.shares as number,
        remainderBurden: burdenMap.get(s.participantId) ?? 0,
      }));

      const rawResults = splitByShares(finalAmount, shareInputs, roundingMode);
      calculatedSplits = rawResults.splits.map((r) => ({
        ...r,
        shares: splitConfig.splits.find((s) => s.participantId === r.participantId)?.shares ?? null,
      }));
      calculatedSurplus = rawResults.surplus;
    }

    validateSplitSum(finalAmount, calculatedSplits, calculatedSurplus);

    // 5. Xác nhận danh tính & quyền chỉnh sửa
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
    if (!deviceToken) return { success: false, error: "Bạn chưa xác nhận danh tính trong nhóm này." };

    const currentParticipant = await prisma.participant.findFirst({
      where: { eventId, deviceToken },
      select: { id: true },
    });

    const isCreator = !!(deviceToken && eventRecord.creatorDeviceToken === deviceToken);
    const isAuthorOrPayer = currentParticipant && (existingExpense.createdById === currentParticipant.id || existingExpense.payerId === currentParticipant.id);

    if (!isCreator && !isAuthorOrPayer) {
      return { success: false, error: "Bạn không có quyền chỉnh sửa khoản chi này." };
    }

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
          receiptUrl: receiptUrl ?? null,
          surplus: calculatedSurplus,
        },
      });

      await tx.expenseSplit.createMany({
        data: calculatedSplits.map((split) => ({
          expenseId: updatedExpense.id,
          participantId: split.participantId,
          amount: split.amount,
          shares: (split as any).shares ?? null,
        })),
      });
    });

    // Delete old receipt from Cloudinary if it was removed or changed
    if (existingExpense.receiptUrl && existingExpense.receiptUrl !== receiptUrl) {
      deleteReceiptFromCloudinary(existingExpense.receiptUrl).catch((err) => {
        console.error("Failed to delete old receipt on update:", err);
      });
    }

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

    const [eventRecord, existingExpense, currentParticipant] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId }, select: { isLocked: true, creatorDeviceToken: true } }),
      prisma.expense.findUnique({ where: { id: expenseId }, select: { receiptUrl: true, createdById: true, payerId: true } }),
      prisma.participant.findFirst({
        where: { eventId, deviceToken },
        select: { id: true },
      }),
    ]);

    if (!eventRecord) return { success: false, error: "Sự kiện không tồn tại." };
    if (eventRecord.isLocked) return { success: false, error: "Sự kiện đã bị khóa, không thể xóa chi tiêu." };
    if (!existingExpense) return { success: false, error: "Khoản chi không tồn tại." };

    const isCreator = !!(deviceToken && eventRecord.creatorDeviceToken === deviceToken);
    const isAuthorOrPayer = currentParticipant && (existingExpense.createdById === currentParticipant.id || existingExpense.payerId === currentParticipant.id);

    if (!isCreator && !isAuthorOrPayer) {
      return { success: false, error: "Bạn không có quyền xóa khoản chi này." };
    }

    if (existingExpense.receiptUrl) {
      deleteReceiptFromCloudinary(existingExpense.receiptUrl).catch((err) => {
        console.error("Failed to delete receipt on expense delete:", err);
      });
    }

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
