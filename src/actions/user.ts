"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface DashboardEvent {
  id: string;
  title: string;
  baseCurrency: string;
  createdAt: Date;
  memberCount: number;
  userParticipantName: string | null;
  totalExpenseAmount: number;
  expenseCount: number;
  isLocked: boolean;
}

export async function getUserDashboardData(): Promise<DashboardEvent[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  try {
    const events = await prisma.event.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
        expenses: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return events.map((event) => {
      const myParticipant = event.participants.find(
        (p) => p.userId === session.user?.id
      );
      const realParticipants = event.participants.filter(
        (p) => p.name !== "🏢 Quỹ Công ty"
      );
      const totalExpenseAmount = event.expenses.reduce(
        (sum, exp) => sum + exp.amount,
        0
      );

      return {
        id: event.id,
        title: event.title,
        baseCurrency: event.baseCurrency,
        createdAt: event.createdAt,
        memberCount: realParticipants.length,
        userParticipantName: myParticipant?.name ?? null,
        totalExpenseAmount,
        expenseCount: event.expenses.length,
        isLocked: event.isLocked,
      };
    });
  } catch (error) {
    console.error("[getUserDashboardData] Error:", error);
    return [];
  }
}
