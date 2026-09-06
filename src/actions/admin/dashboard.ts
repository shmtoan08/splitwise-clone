"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export interface RecentEventItem {
  id: string;
  title: string;
  baseCurrency: string;
  isLocked: boolean;
  createdAt: Date;
  _count: {
    participants: number;
    expenses: number;
  };
}

export interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalExpenses: number;
  recentEvents: RecentEventItem[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      throw new Error("UNAUTHORIZED");
    }

    const [totalUsers, totalEvents, totalExpenses, recentEvents] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.expense.count(),
      prisma.event.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          baseCurrency: true,
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
    ]);

    return {
      totalUsers,
      totalEvents,
      totalExpenses,
      recentEvents,
    };
  } catch (error) {
    console.error("[getDashboardStats] Error fetching admin dashboard stats:", error);
    throw error;
  }
}
