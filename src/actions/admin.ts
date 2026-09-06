"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type AdminStats = {
  totalUsers: number;
  totalEvents: number;
  totalExpenses: number;
};

export async function getAdminStats(): Promise<{
  success: boolean;
  data?: AdminStats;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { success: false, error: "unauthorized" };
    }

    const [totalUsers, totalEvents, totalExpenses] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.expense.count(),
    ]);

    return {
      success: true,
      data: {
        totalUsers,
        totalEvents,
        totalExpenses,
      },
    };
  } catch (error) {
    console.error("[getAdminStats] Error fetching admin stats:", error);
    return {
      success: false,
      error: "system_error",
    };
  }
}
