import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { calculateEventBalances } from "@/actions/settlement";
import { SettlementRow } from "@/components/event/SettlementRow";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

type Props = {
  params: Promise<{ eventId: string }>;
};

export const metadata: Metadata = {
  title: "Chốt sổ",
};

export default async function SettlementPage({ params }: Props) {
  const { eventId } = await params;
  const t = await getTranslations("settlement");
  const tEvent = await getTranslations("event");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { currency: true, title: true }
  });

  if (!event) {
    notFound();
  }

  // Lấy balances và giao dịch tối giản (tính toán thuần tuý)
  const calcRes = await calculateEventBalances(eventId);
  let content: React.ReactNode;

  if (!calcRes.success || !calcRes.data) {
    content = (
      <main className="p-4 max-w-2xl mx-auto w-full">
        <p className="text-destructive text-center mt-8">{t("error")}</p>
      </main>
    );
  } else {
    const { transactions } = calcRes.data;

    // Lấy currentParticipantId và currency từ cookie server-side
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get("split-app-device-token")?.value;
    const localeCurrency = cookieStore.get("NEXT_LOCALE_CURRENCY")?.value;
    const currency = localeCurrency || event.currency;
    let currentParticipantId: string | null = null;
    if (deviceToken) {
      const participant = await prisma.participant.findFirst({
        where: { eventId, deviceToken },
        select: { id: true }
      });
      if (participant) {
        currentParticipantId = participant.id;
      }
    }

    if (transactions.length === 0) {
      content = (
        <main className="p-4 w-full text-center mt-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-slate-900">{t("title")}</h1>
          <p className="text-sm font-medium text-slate-500">{t("allSettled")}</p>
        </main>
      );
    } else {
      // Lấy các bản ghi Settlement thật từ DB
      const dbSettlements = await prisma.settlement.findMany({
        where: { eventId },
        select: {
          id: true,
          fromId: true,
          toId: true,
          amount: true,
          status: true,
        }
      });

      // Lấy thông tin thanh toán của tất cả participant trong event này
      const paymentInfos = await prisma.paymentInfo.findMany({
        where: { participant: { eventId } },
        select: { participantId: true, bankBIN: true, accountNumber: true, accountName: true, paypayLink: true }
      });

      content = (
        <main className="p-4 w-full">
          <h1 className="text-xl font-bold mb-4 text-slate-900">{t("title")}</h1>
          
          <div className="flex flex-col gap-3 pb-20">
            {transactions.map((tx, idx) => {
              const settlement = dbSettlements.find(s => 
                s.fromId === tx.fromId && 
                s.toId === tx.toId && 
                s.status !== "PENDING"
              ) || null;

              const toPaymentInfo = paymentInfos.find(p => p.participantId === tx.toId) || null;

              return (
                <SettlementRow 
                  key={idx}
                  eventId={eventId}
                  transaction={tx}
                  settlement={settlement}
                  currency={currency}
                  currentParticipantId={currentParticipantId}
                  toPaymentInfo={toPaymentInfo}
                  eventTitle={event.title}
                />
              );
            })}
          </div>
        </main>
      );
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative overflow-y-auto scrollbar-hide">
      {content}
    </div>
  );
}
