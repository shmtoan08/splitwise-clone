"use server";

import { prisma } from "@/lib/prisma";
import { createEventSchema } from "@/schemas/event.schema";
import { updateEventCurrencySchema } from "@/schemas/event.schema";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

const DEVICE_TOKEN_COOKIE = "split-app-device-token";

export async function createEvent(
  data: unknown
): Promise<ActionResult<{ eventId: string; deviceToken?: string }> | undefined> {
  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Dữ liệu đầu vào không hợp lệ" };
  }

  let eventId: string;
  let deviceToken: string | undefined;
  try {
    // Lấy hoặc tạo mới deviceToken để gắn làm creatorDeviceToken
    const cookieStore = await cookies();
    deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    if (!deviceToken) {
      deviceToken = randomUUID();
      // Set cookie cho creator ngay lúc tạo event
      cookieStore.set(DEVICE_TOKEN_COOKIE, deviceToken, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: false,
        sameSite: "lax",
      });
    }

    const newEvent = await prisma.event.create({
      data: {
        title: parsed.data.title,
        baseCurrency: parsed.data.currency ?? "VND",
        creatorDeviceToken: deviceToken,
      },
      select: {
        id: true,
      },
    });
    eventId = newEvent.id;
  } catch (error) {
    console.error("[createEvent] error:", error);
    return { success: false, error: "Đã xảy ra lỗi khi tạo nhóm. Vui lòng thử lại." };
  }

  return { success: true, data: { eventId, deviceToken } };
}

export async function getEventById(eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        baseCurrency: true,
        creatorDeviceToken: true,
        isAdvancedMode: true,
        participants: {
          select: {
            id: true,
            name: true,
            deviceToken: true,
            budgetMode: true,
            budget: true,
            weight: true,
            familyConfig: true,
            paymentInfo: {
              select: {
                bankBIN: true,
                accountNumber: true,
                accountName: true,
                paypayLink: true,
              }
            }
          }
        },
        expenses: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            amount: true,
            payerId: true,
            createdAt: true,
            version: true,
            originalCurrency: true,
            exchangeRate: true,
            isCrossSubsidy: true,
            splits: {
              select: {
                participantId: true,
                amount: true,
              }
            }
          }
        },
        groups: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                participantId: true
              }
            }
          }
        },
        settlements: {
          select: {
            id: true,
            fromId: true,
            toId: true,
            amount: true,
            status: true
          }
        }
      },
    });
    return event;
  } catch (error) {
    console.error("[getEventById] error:", error);
    return null;
  }
}

/**
 * Lấy thống kê nhanh của một event (dành cho Quick View tại trang chủ).
 *
 * Security: Chỉ trả data nếu deviceToken của thiết bị khớp với ít nhất
 * 1 participant trong event — tránh xem trộm dữ liệu event của người khác.
 *
 * Tính toán balances + settlements ngay trên server, chỉ trả payload gọn.
 */
export async function getEventSummary(eventId: string): Promise<
  | {
      success: true;
      data: {
        currency: string;
        memberStats: Array<{ id: string; name: string; isMe: boolean; paid: number; owed: number; balance: number }>;
        settlements: Array<{ fromId: string; fromName: string; isFromMe: boolean; toId: string; toName: string; isToMe: boolean; amount: number }>;
        hasExpenses: boolean;
      };
    }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    // Fetch event với minimal data cần thiết
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        baseCurrency: true,
        creatorDeviceToken: true,
        participants: {
          select: { id: true, name: true, deviceToken: true },
        },
        expenses: {
          select: {
            payerId: true,
            amount: true,
            splits: { select: { participantId: true, amount: true } },
          },
        },
      },
    });

    if (!event) {
      return { success: false, error: "not_found" };
    }

    // Security: kiểm tra deviceToken khớp participant hoặc creator
    const isParticipant = !!deviceToken && event.participants.some((p) => p.deviceToken === deviceToken);
    const isCreator = !!deviceToken && event.creatorDeviceToken === deviceToken;

    if (!isParticipant && !isCreator) {
      return { success: false, error: "unauthorized" };
    }

    const { calculateBalances, simplifyDebts } = await import("@/utils/algorithm");

    const participantIds = event.participants.map((p) => p.id);
    const participantMap = new Map(event.participants.map((p) => [p.id, p.name]));

    // Tính stats từng người
    const statsMap = new Map<string, { paid: number; owed: number }>(
      participantIds.map((id) => [id, { paid: 0, owed: 0 }])
    );
    for (const ex of event.expenses) {
      const payer = statsMap.get(ex.payerId);
      if (payer) payer.paid += ex.amount;
      for (const s of ex.splits) {
        const sp = statsMap.get(s.participantId);
        if (sp) sp.owed += s.amount;
      }
    }

    const memberStats = event.participants.map((p) => {
      const s = statsMap.get(p.id) ?? { paid: 0, owed: 0 };
      const isMe = !!deviceToken && p.deviceToken === deviceToken;
      return { id: p.id, name: p.name, isMe, paid: s.paid, owed: s.owed, balance: s.paid - s.owed };
    });

    // Tính settlements trên server
    const balances = calculateBalances(participantIds, event.expenses);
    const txns = simplifyDebts(balances);
    const settlements = txns.map((t) => {
      const fromParticipant = event.participants.find((p) => p.id === t.from);
      const toParticipant = event.participants.find((p) => p.id === t.to);
      return {
        fromId: t.from,
        fromName: fromParticipant?.name ?? "Unknown",
        isFromMe: !!deviceToken && fromParticipant?.deviceToken === deviceToken,
        toId: t.to,
        toName: toParticipant?.name ?? "Unknown",
        isToMe: !!deviceToken && toParticipant?.deviceToken === deviceToken,
        amount: t.amount,
      };
    });

    return {
      success: true,
      data: {
        currency: event.baseCurrency,
        memberStats,
        settlements,
        hasExpenses: event.expenses.length > 0,
      },
    };
  } catch (error) {
    console.error("[getEventSummary] error:", error);
    return { success: false, error: "system_error" };
  }
}

/**
 * Đổi baseCurrency của Event.
 * Ràng buộc:
 * 1. Chỉ creatorDeviceToken mới có quyền đổi (soft-permission).
 * 2. Không cho đổi nếu event đã có Expense (tránh convert lại dữ liệu cũ).
 */
export async function updateEventCurrency(data: unknown): Promise<ActionResult> {
  const parsed = updateEventCurrencySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { eventId, baseCurrency } = parsed.data;

  try {
    // 1. Lấy deviceToken từ cookie
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    if (!deviceToken) {
      return { success: false, error: "unauthorized" };
    }

    // 2. Fetch event để kiểm tra quyền và trạng thái
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        creatorDeviceToken: true,
        _count: { select: { expenses: true } },
      },
    });

    if (!event) {
      return { success: false, error: "Sự kiện không tồn tại." };
    }

    // 3. Kiểm tra quyền creator
    if (event.creatorDeviceToken !== deviceToken) {
      return { success: false, error: "unauthorized" };
    }

    // 4. Chặn đổi nếu đã có Expense
    if (event._count.expenses > 0) {
      return { success: false, error: "CANNOT_CHANGE_CURRENCY_WITH_EXPENSES" };
    }

    // 5. Cập nhật
    await prisma.event.update({
      where: { id: eventId },
      data: { baseCurrency },
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateEventCurrency] error:", error);
    return { success: false, error: "Lỗi hệ thống khi đổi tiền tệ. Vui lòng thử lại." };
  }
}

export async function toggleAdvancedMode(eventId: string, isAdvancedMode: boolean) {
  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    if (!deviceToken) {
      return { success: false, error: "unauthorized" };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { creatorDeviceToken: true },
    });

    if (!event) return { success: false, error: "Sự kiện không tồn tại" };
    
    if (event.creatorDeviceToken !== deviceToken) {
      return { success: false, error: "unauthorized" };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { isAdvancedMode },
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("[toggleAdvancedMode] error:", error);
    return { success: false, error: "Lỗi hệ thống" };
  }
}
