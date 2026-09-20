"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export interface AdminEventItem {
  id: string;
  title: string;
  baseCurrency: string;
  isAdvancedMode: boolean;
  isLocked: boolean;
  createdAt: Date;
  _count: {
    participants: number;
    expenses: number;
  };
}

export interface GetAdminEventsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "ALL" | "ACTIVE" | "LOCKED" | string;
}

export interface GetAdminEventsResult {
  events: AdminEventItem[];
  totalEvents: number;
  currentPage: number;
  totalPages: number;
}

export async function getAdminEvents({
  page = 1,
  pageSize = 10,
  search = "",
  status = "ALL",
}: GetAdminEventsParams = {}): Promise<GetAdminEventsResult> {
  await requireAdmin();

  const currentPage = Math.max(1, page);
  const skip = (currentPage - 1) * pageSize;
  const trimmedSearch = search.trim();

  // Xây dựng điều kiện lọc
  const where: any = {};

  if (trimmedSearch) {
    where.OR = [
      {
        title: {
          contains: trimmedSearch,
          mode: "insensitive",
        },
      },
      {
        id: {
          equals: trimmedSearch,
        },
      },
    ];
  }

  if (status === "LOCKED") {
    where.isLocked = true;
  } else if (status === "ACTIVE") {
    where.isLocked = false;
  }

  const [events, totalEvents] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        baseCurrency: true,
        isAdvancedMode: true,
        isLocked: true,
        createdAt: true,
        _count: {
          select: {
            participants: true,
            expenses: true,
          },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  const totalPages = Math.ceil(totalEvents / pageSize) || 1;

  return {
    events: events as AdminEventItem[],
    totalEvents,
    currentPage,
    totalPages,
  };
}

export async function adminToggleLockEvent(
  eventId: string,
  isLocked: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      return { success: false, error: "EVENT_NOT_FOUND" };
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { isLocked },
    });

    revalidatePath("/admin/events");
    revalidatePath(`/e/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("[adminToggleLockEvent] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}

export async function adminDeleteEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    await prisma.event.delete({
      where: { id: eventId },
    });

    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    console.error("[adminDeleteEvent] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}

export async function adminBulkDeleteEvents(
  eventIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requireAdmin();

    if (!eventIds.length) {
      return { success: true, count: 0 };
    }

    const result = await prisma.event.deleteMany({
      where: { id: { in: eventIds } },
    });

    revalidatePath("/admin/events");
    return { success: true, count: result.count };
  } catch (error) {
    console.error("[adminBulkDeleteEvents] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}

export async function adminBulkToggleLockEvents(
  eventIds: string[],
  isLocked: boolean
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requireAdmin();

    if (!eventIds.length) {
      return { success: true, count: 0 };
    }

    const result = await prisma.event.updateMany({
      where: { id: { in: eventIds } },
      data: { isLocked },
    });

    revalidatePath("/admin/events");
    return { success: true, count: result.count };
  } catch (error) {
    console.error("[adminBulkToggleLockEvents] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}

export interface AdminEventMemberItem {
  id: string;
  name: string;
  hasDevice: boolean;
  isCreator: boolean;
  joinedAt: Date;
  deviceToken: string | null;
  deviceInfo?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

export async function getAdminEventMembers(
  eventId: string
): Promise<{ success: boolean; data?: AdminEventMemberItem[]; error?: string }> {
  try {
    await requireAdmin();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { creatorDeviceToken: true },
    });

    if (!event) {
      return { success: false, error: "EVENT_NOT_FOUND" };
    }

    const participants = await prisma.participant.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        deviceToken: true,
        deviceInfo: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    const mapped = participants.map((p) => ({
      id: p.id,
      name: p.name,
      hasDevice: p.deviceToken !== null,
      isCreator: p.deviceToken === event.creatorDeviceToken && p.deviceToken !== null,
      joinedAt: p.createdAt,
      deviceToken: p.deviceToken,
      deviceInfo: p.deviceInfo,
      user: p.user,
    }));

    return { success: true, data: mapped };
  } catch (error) {
    console.error("[getAdminEventMembers] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}
