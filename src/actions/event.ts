"use server";

import { prisma } from "@/lib/prisma";
import { createEventSchema } from "@/schemas/event.schema";
import { updateEventCurrencySchema } from "@/schemas/event.schema";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { deleteReceiptFromCloudinary } from "@/actions/expense";

// Cấu hình Cloudinary SDK ở Server
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
        avgBudget: true,
        creatorDeviceToken: true,
        isAdvancedMode: true,
        isLocked: true,
        seikyuClaimerId: true,
        participants: {
          select: {
            id: true,
            name: true,
            createdAt: true,
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
            splitMode: true,
            receiptUrl: true,
            splits: {
              select: {
                participantId: true,
                amount: true,
                shares: true,
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
        settlements: Array<{
          fromId: string;
          fromName: string;
          isFromMe: boolean;
          toId: string;
          toName: string;
          isToMe: boolean;
          amount: number;
          status: "PENDING" | "MARKED_PAID" | "CONFIRMED";
        }>;
        hasExpenses: boolean;
      };
    }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    // Fetch event với đầy đủ data cho smart settlement
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        baseCurrency: true,
        creatorDeviceToken: true,
        isAdvancedMode: true,
        seikyuClaimerId: true,
        participants: {
          select: {
            id: true,
            name: true,
            deviceToken: true,
            budgetMode: true,
            budget: true,
            weight: true,
          },
        },
        expenses: {
          select: {
            payerId: true,
            amount: true,
            isCrossSubsidy: true,
            splits: { select: { participantId: true, amount: true } },
          },
        },
        settlements: {
          select: {
            fromId: true,
            toId: true,
            amount: true,
            status: true,
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

    const { simplifyDebts } = await import("@/utils/algorithm");

    const paidMap = new Map<string, number>();
    const owedMap = new Map<string, number>();
    const subsidyMap = new Map<string, number>();

    event.participants.forEach((p) => {
      paidMap.set(p.id, 0);
      owedMap.set(p.id, 0);
    });

    const fundParticipant = event.participants.find((p) => p.name === "🏢 Quỹ Công ty");
    const fundId = fundParticipant?.id;
    const virtualFundId = fundId || "virtual-fund";

    if (!paidMap.has(virtualFundId)) paidMap.set(virtualFundId, 0);
    if (!owedMap.has(virtualFundId)) owedMap.set(virtualFundId, 0);

    for (const ex of event.expenses) {
      if (ex.isCrossSubsidy) {
        for (const s of ex.splits) {
          subsidyMap.set(s.participantId, (subsidyMap.get(s.participantId) || 0) + s.amount);
        }
      } else {
        paidMap.set(ex.payerId, (paidMap.get(ex.payerId) || 0) + ex.amount);
        for (const s of ex.splits) {
          owedMap.set(s.participantId, (owedMap.get(s.participantId) || 0) + s.amount);
        }
      }
    }

    const finalBalances: Record<string, number> = {};

    event.participants.forEach((p) => {
      let paid = paidMap.get(p.id) || 0;
      let owed = owedMap.get(p.id) || 0;
      let subsidy = subsidyMap.get(p.id) || 0;

      if (event.isAdvancedMode && p.id !== virtualFundId) {
        let companyCovered = 0;
        if (p.budgetMode === "UNLIMITED") {
          companyCovered = owed;
        } else if (p.budgetMode === "FIXED") {
          companyCovered = Math.min(owed, p.budget || 0) + subsidy;
        }
        owed -= companyCovered;
        owedMap.set(virtualFundId, (owedMap.get(virtualFundId) || 0) + companyCovered);
      }

      if (p.id !== virtualFundId) {
        finalBalances[p.id] = paid - owed;
      }
    });

    finalBalances[virtualFundId] = (paidMap.get(virtualFundId) || 0) - (owedMap.get(virtualFundId) || 0);

    if (finalBalances[virtualFundId] === 0 && !fundId) {
      delete finalBalances[virtualFundId];
    }

    const claimerId = event.seikyuClaimerId;
    if (claimerId && finalBalances[virtualFundId]) {
      const fundBal = finalBalances[virtualFundId];
      finalBalances[claimerId] = (finalBalances[claimerId] || 0) + fundBal;
      delete finalBalances[virtualFundId];
    }

    const balanceArray = Object.entries(finalBalances).map(([id, balance]) => ({
      id,
      balance,
    }));

    let txs: { from: string; to: string; amount: number }[] = [];
    if (claimerId) {
      for (const { id, balance } of balanceArray) {
        if (id === claimerId) continue;
        if (balance < 0) {
          txs.push({ from: id, to: claimerId, amount: Math.abs(balance) });
        } else if (balance > 0) {
          txs.push({ from: claimerId, to: id, amount: balance });
        }
      }
    } else {
      txs = simplifyDebts(balanceArray);
    }

    const participantMap = new Map(event.participants.map((p) => [p.id, p]));
    if (!participantMap.has("virtual-fund")) {
      participantMap.set("virtual-fund", {
        id: "virtual-fund",
        name: "🏢 Quỹ Công ty",
        deviceToken: null,
        budgetMode: "FIXED" as any,
        budget: 0,
        weight: 1,
      });
    }

    const memberStats = event.participants
      .filter((p) => p.name !== "🏢 Quỹ Công ty")
      .map((p) => {
        const paid = paidMap.get(p.id) || 0;
        const owed = owedMap.get(p.id) || 0;
        const balance = finalBalances[p.id] ?? 0;
        const isMe = !!deviceToken && p.deviceToken === deviceToken;
        return { id: p.id, name: p.name, isMe, paid, owed, balance };
      });

    const settlements = txs.map((t) => {
      const fromParticipant = participantMap.get(t.from);
      const toParticipant = participantMap.get(t.to);
      const dbSettlement = event.settlements.find(
        (s) => s.fromId === t.from && s.toId === t.to && s.amount === t.amount && s.status !== "PENDING"
      );
      return {
        fromId: t.from,
        fromName: fromParticipant?.name ?? "Unknown",
        isFromMe: !!deviceToken && fromParticipant?.deviceToken === deviceToken,
        toId: t.to,
        toName: toParticipant?.name ?? "Unknown",
        isToMe: !!deviceToken && toParticipant?.deviceToken === deviceToken,
        amount: t.amount,
        status: (dbSettlement?.status ?? "PENDING") as "PENDING" | "MARKED_PAID" | "CONFIRMED",
      };
    });

    const hasActualExpenses = event.expenses.some((ex) => !ex.isCrossSubsidy);

    return {
      success: true,
      data: {
        currency: event.baseCurrency,
        memberStats,
        settlements,
        hasExpenses: hasActualExpenses,
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
        isLocked: true,
        _count: { select: { expenses: true } },
      },
    });

    if (!event) {
      return { success: false, error: "Sự kiện không tồn tại." };
    }

    if (event.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa, không thể đổi tiền tệ." };
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
      select: { creatorDeviceToken: true, isLocked: true },
    });

    if (!event) return { success: false, error: "Sự kiện không tồn tại" };
    if (event.isLocked) return { success: false, error: "Sự kiện đã bị khóa." };
    
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

export async function updateSeikyuClaimer({
  eventId,
  claimerId,
}: {
  eventId: string;
  claimerId: string | null;
}) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLocked: true },
    });
    if (event?.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa." };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { seikyuClaimerId: claimerId },
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Lỗi khi cập nhật người đại diện Seikyu:", error);
    return { success: false, error: "Không thể lưu người đại diện vào hệ thống." };
  }
}

export async function updateEventTitle({
  eventId,
  title,
}: {
  eventId: string;
  title: string;
}): Promise<ActionResult> {
  const trimmed = title.trim();
  if (!trimmed) {
    return { success: false, error: "Tên sự kiện không được để trống" };
  }
  if (trimmed.length > 100) {
    return { success: false, error: "Tên sự kiện tối đa 100 ký tự" };
  }

  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { creatorDeviceToken: true, isLocked: true },
    });

    if (!event) {
      return { success: false, error: "Sự kiện không tồn tại." };
    }

    if (event.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa, không thể đổi tên." };
    }

    if (!deviceToken || event.creatorDeviceToken !== deviceToken) {
      return { success: false, error: "unauthorized" };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { title: trimmed },
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateEventTitle] error:", error);
    return { success: false, error: "Lỗi hệ thống khi cập nhật tên sự kiện." };
  }
}

export async function toggleEventLock(
  eventId: string,
  isLocked: boolean
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { creatorDeviceToken: true },
    });

    if (!event) {
      return { success: false, error: "Sự kiện không tồn tại." };
    }

    if (!deviceToken || event.creatorDeviceToken !== deviceToken) {
      return { success: false, error: "unauthorized" };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { isLocked },
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[toggleEventLock] error:", error);
    return { success: false, error: "Lỗi hệ thống khi thay đổi trạng thái khóa." };
  }
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        creatorDeviceToken: true,
        expenses: {
          where: { receiptUrl: { not: null } },
          select: { receiptUrl: true },
        },
      },
    });

    if (!event) {
      return { success: false, error: "Sự kiện không tồn tại." };
    }

    if (!deviceToken || event.creatorDeviceToken !== deviceToken) {
      return { success: false, error: "unauthorized" };
    }

    // 1. Xóa tất cả ảnh hóa đơn của sự kiện trên Cloudinary
    for (const exp of event.expenses) {
      if (exp.receiptUrl) {
        await deleteReceiptFromCloudinary(exp.receiptUrl);
      }
    }

    // Dọn dẹp thư mục sự kiện trên Cloudinary (nếu có)
    try {
      if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        await cloudinary.api.delete_resources_by_prefix(`split_app/events/${eventId}`);
        await cloudinary.api.delete_folder(`split_app/events/${eventId}`);
      }
    } catch (cErr) {
      console.warn("[deleteEvent] Cloudinary cleanup warning:", cErr);
    }

    // 2. Xóa Event trong Database (Tất cả bảng liên quan: Participant, PaymentInfo, Expense, ExpenseSplit, Settlement, Group, GroupMember sẽ tự động được xóa theo Cascade)
    await prisma.event.delete({
      where: { id: eventId },
    });

    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deleteEvent] error:", error);
    return { success: false, error: "Lỗi hệ thống khi xóa sự kiện." };
  }
}