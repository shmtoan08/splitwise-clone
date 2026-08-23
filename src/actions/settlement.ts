"use server";

// TODO: Implement settlement Server Actions
//
// QUAN TRỌNG: Xác nhận thanh toán BẮT BUỘC qua đúng 2 bước tách biệt:
// 1. markAsPaid()     — A (con nợ) gọi, chuyển PENDING → MARKED_PAID
// 2. confirmReceived() — B (chủ nợ) gọi, chuyển MARKED_PAID → CONFIRMED
//
// Cả 2 hàm đều phải:
// - Đọc deviceToken từ httpOnly cookie phía SERVER (không tin client gửi lên)
// - Verify deviceToken khớp với Participant tương ứng (from/to)
// - Verify Settlement.status đang ở đúng trạng thái trước khi chuyển
//
// CẤM tạo hàm nào set status = CONFIRMED trực tiếp từ 1 action duy nhất.

import { prisma } from "@/lib/prisma";
import { calculateBalances, simplifyDebts } from "@/utils/algorithm";

import type { ActionResult } from "@/types";

export type ParticipantBalance = {
  id: string;
  name: string;
  balance: number;
};

export type MappedTransaction = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

/**
 * Tính toán công nợ và trả về danh sách giao dịch tối giản cho 1 event.
 * Không ghi vào database.
 */
export async function calculateEventBalances(eventId: string): Promise<ActionResult<{ balances: ParticipantBalance[], transactions: MappedTransaction[] }>> {
  try {
    const participants = await prisma.participant.findMany({
      where: { eventId },
      select: { id: true, name: true }
    });

    if (participants.length === 0) {
      return { success: true, data: { balances: [], transactions: [] } };
    }

    const expenses = await prisma.expense.findMany({
      where: { eventId },
      select: {
        payerId: true,
        splits: {
          select: {
            participantId: true,
            amount: true
          }
        }
      }
    });

    const participantIds = participants.map(p => p.id);
    const balances = calculateBalances(participantIds, expenses);
    const transactions = simplifyDebts(balances);

    const participantMap = new Map(participants.map(p => [p.id, p.name]));

    const mappedBalances = balances.map(b => ({
      id: b.id,
      name: participantMap.get(b.id) || "Unknown",
      balance: b.balance
    }));

    const mappedTransactions = transactions.map(t => ({
      fromId: t.from,
      fromName: participantMap.get(t.from) || "Unknown",
      toId: t.to,
      toName: participantMap.get(t.to) || "Unknown",
      amount: t.amount
    }));

    return { success: true, data: { balances: mappedBalances, transactions: mappedTransactions } };
  } catch (error: any) {
    console.error("[calculateEventBalances] error:", error);
    return { success: false, error: "Lỗi hệ thống khi tính toán công nợ. Vui lòng thử lại sau." };
  }
}

import { cookies } from "next/headers";
import { MarkAsPaidSchema, ConfirmReceivedSchema } from "@/schemas/settlement.schema";
import { revalidatePath } from "next/cache";

const DEVICE_TOKEN_COOKIE = "split-app-device-token";

/**
 * A (người nợ) bấm "Đã chuyển tiền" → PENDING → MARKED_PAID
 * Validate: deviceToken của caller phải khớp Settlement.from.deviceToken
 */
export async function markAsPaid(data: unknown): Promise<ActionResult> {
  const parsed = MarkAsPaidSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Dữ liệu không hợp lệ" };
  }

  const { eventId, fromId, toId, amount } = parsed.data;

  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    if (!deviceToken) {
      return { success: false, error: "Không xác định được danh tính" };
    }

    const currentParticipant = await prisma.participant.findFirst({
      where: { eventId, deviceToken },
      select: { id: true }
    });

    if (!currentParticipant) {
      return { success: false, error: "Không xác định được danh tính" };
    }

    if (currentParticipant.id !== fromId) {
      return { success: false, error: "Bạn không phải người nợ khoản này" };
    }

    const existingSettlement = await prisma.settlement.findFirst({
      where: {
        eventId,
        fromId,
        toId,
        status: {
          in: ["MARKED_PAID", "CONFIRMED"]
        }
      }
    });

    if (existingSettlement) {
      return { success: true, data: undefined }; // Idempotent
    }

    await prisma.settlement.create({
      data: {
        eventId,
        fromId,
        toId,
        amount,
        status: "MARKED_PAID",
      }
    });

    revalidatePath(`/e/${eventId}/settlement`);
    return { success: true, data: undefined };
  } catch (error: any) {
    console.error("[markAsPaid] error:", error);
    return { success: false, error: "Lỗi hệ thống khi xác nhận chuyển tiền." };
  }
}

/**
 * B (người nhận) bấm "Đã nhận được" → MARKED_PAID → CONFIRMED
 * Validate: deviceToken của caller phải khớp Settlement.to.deviceToken
 */
export async function confirmReceived(data: unknown): Promise<ActionResult> {
  const parsed = ConfirmReceivedSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Dữ liệu không hợp lệ" };
  }

  const { settlementId } = parsed.data;

  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    if (!deviceToken) {
      return { success: false, error: "Không xác định được danh tính" };
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      select: { eventId: true, toId: true, status: true }
    });

    if (!settlement) {
      return { success: false, error: "Giao dịch không tồn tại" };
    }

    const currentParticipant = await prisma.participant.findFirst({
      where: { eventId: settlement.eventId, deviceToken },
      select: { id: true }
    });

    if (!currentParticipant || currentParticipant.id !== settlement.toId) {
      return { success: false, error: "Bạn không phải người nhận khoản này" };
    }

    if (settlement.status === "PENDING") {
      return { success: false, error: "Người chuyển chưa xác nhận thanh toán." };
    }

    if (settlement.status === "CONFIRMED") {
      return { success: false, error: "Giao dịch đã được xác nhận trước đó." };
    }

    await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      }
    });

    revalidatePath(`/e/${settlement.eventId}/settlement`);
    return { success: true, data: undefined };
  } catch (error: any) {
    console.error("[confirmReceived] error:", error);
    return { success: false, error: "Lỗi hệ thống khi xác nhận nhận tiền." };
  }
}
