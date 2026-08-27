"use server";

import { prisma } from "@/lib/prisma";
import { addParticipantSchema, claimIdentitySchema, PaymentInfoSchema, updateFamilyConfigSchema } from "@/schemas/participant.schema";
import type { ActionResult } from "@/types";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

const DEVICE_TOKEN_COOKIE = "split-app-device-token";

export async function addParticipant(
  data: unknown
): Promise<ActionResult<{ participantId: string }>> {
  const parsed = addParticipantSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Dữ liệu không hợp lệ" };
  }

  const { eventId, name, isSelf } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  if (!event) {
    return { success: false, error: "Nhóm không tồn tại" };
  }

  try {
    let deviceToken: string | null = null;
    if (isSelf) {
      // Ưu tiên giữ lại cookie hiện tại (creator token) để không ghi đè isCreator
      const cookieStore = await cookies();
      const existingToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
      deviceToken = existingToken ?? randomUUID();

      const participant = await prisma.participant.create({
        data: {
          eventId,
          name,
          deviceToken,
        },
        select: { id: true },
      });

      // Chỉ set cookie nếu chưa có (không ghi đè creator token)
      if (!existingToken) {
        cookieStore.set(DEVICE_TOKEN_COOKIE, deviceToken, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365, // 1 year
          httpOnly: false, // client hook needs to read it
          sameSite: "lax",
        });
      }

      revalidatePath(`/e/${eventId}`);
      return { success: true, data: { participantId: participant.id } };
    } else {
      // Thêm thành viên bình thường (không phải bản thân)
      const participant = await prisma.participant.create({
        data: { eventId, name, deviceToken: null },
        select: { id: true },
      });
      revalidatePath(`/e/${eventId}`);
      return { success: true, data: { participantId: participant.id } };
    }
  } catch (error) {
    console.error("[addParticipant] error:", error);
    return { success: false, error: "Không thể thêm thành viên. Vui lòng thử lại." };
  }
}

export async function deleteParticipant(eventId: string, participantId: string): Promise<ActionResult> {
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

  if (!deviceToken) {
    return { success: false, error: "unauthorized" };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { creatorDeviceToken: true },
  });

  if (!event || event.creatorDeviceToken !== deviceToken) {
    return { success: false, error: "unauthorized" };
  }

  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { deviceToken: true },
    });

    if (!participant) {
      return { success: false, error: "Thành viên không tồn tại" };
    }

    if (participant.deviceToken === event.creatorDeviceToken) {
      return { success: false, error: "CANNOT_DELETE_CREATOR" };
    }

    // Safety Check
    const expensesAsPayer = await prisma.expense.count({
      where: { payerId: participantId },
    });

    const expensesAsSplit = await prisma.expenseSplit.count({
      where: { participantId },
    });

    if (expensesAsPayer > 0 || expensesAsSplit > 0) {
      return { success: false, error: "HAS_EXPENSES" };
    }

    // Safe to delete
    await prisma.participant.delete({
      where: { id: participantId },
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deleteParticipant] error:", error);
    return { success: false, error: "Lỗi hệ thống. Vui lòng thử lại sau." };
  }
}

export async function claimParticipantIdentity(
  participantId: string,
  eventId: string
): Promise<ActionResult> {
  const parsed = claimIdentitySchema.safeParse({ participantId, eventId });
  if (!parsed.success) {
    return { success: false, error: "Dữ liệu không hợp lệ" };
  }

  const cookieStore = await cookies();
  const existingToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId, eventId },
      select: { id: true, deviceToken: true },
    });

    if (!participant) {
      return { success: false, error: "Không tìm thấy thành viên này trong nhóm." };
    }

    if (participant.deviceToken) {
      if (participant.deviceToken === existingToken) {
        return { success: true, data: undefined };
      }
      return { success: false, error: "Thành viên này đã được chọn bởi thiết bị khác." };
    }

    // Reuse existing device token if device already has one, else create new
    const tokenToUse = existingToken || randomUUID();

    await prisma.participant.update({
      where: { id: participantId },
      data: { deviceToken: tokenToUse },
    });

    if (!existingToken) {
      cookieStore.set(DEVICE_TOKEN_COOKIE, tokenToUse, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: false,
        sameSite: "lax",
      });
    }

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[claimParticipantIdentity] error:", error);
    return { success: false, error: "Lỗi hệ thống. Vui lòng thử lại sau." };
  }
}

type UpdatePaymentInfoInput = {
  eventId: string;
  paymentInfo: {
    bankBIN?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
    paypayLink?: string | null;
  };
};

export async function updatePaymentInfo(
  input: UpdatePaymentInfoInput
): Promise<ActionResult> {
  const { eventId, paymentInfo } = input;

  // 1. Read device token from HTTP cookie server-side
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

  if (!deviceToken) {
    return { success: false, error: "Không xác định được danh tính" };
  }

  // 2. Find participant matching deviceToken AND eventId (server-authoritative)
  const participant = await prisma.participant.findFirst({
    where: { eventId, deviceToken },
    select: { id: true },
  });

  if (!participant) {
    return { success: false, error: "Không xác định được danh tính" };
  }

  // 3. Validate paymentInfo
  const parsed = PaymentInfoSchema.safeParse(paymentInfo);
  if (!parsed.success) {
    return { success: false, error: "Thông tin thanh toán không hợp lệ" };
  }

  const paymentData = parsed.data;

  try {
    // 4. Upsert PaymentInfo
    await prisma.paymentInfo.upsert({
      where: { participantId: participant.id },
      create: { participantId: participant.id, ...paymentData },
      update: { ...paymentData },
    });

    // 5. Revalidate relevant paths
    revalidatePath(`/e/${eventId}`);
    revalidatePath(`/e/${eventId}/settlement`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updatePaymentInfo] error:", error);
    return { success: false, error: "Lỗi hệ thống khi lưu thông tin thanh toán." };
  }
}

export async function updateParticipantFamilyConfig(
  participantId: string,
  eventId: string,
  familyConfig: { adults: number; children: number[] }
): Promise<ActionResult> {
  const parsed = updateFamilyConfigSchema.safeParse({ participantId, eventId, familyConfig });
  if (!parsed.success) {
    return { success: false, error: "Cấu hình gia đình không hợp lệ" };
  }

  const { adults, children } = parsed.data.familyConfig;
  const weight = adults + children.reduce((sum, child) => sum + child, 0);

  try {
    await prisma.participant.update({
      where: { id: participantId, eventId },
      data: {
        familyConfig: parsed.data.familyConfig,
        weight,
      },
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[updateParticipantFamilyConfig] error:", error);
    return { success: false, error: "Không thể lưu cấu hình gia đình. Vui lòng thử lại." };
  }
}
