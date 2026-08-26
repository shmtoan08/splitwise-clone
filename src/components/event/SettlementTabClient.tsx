"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { SettlementRow } from "@/components/event/SettlementRow";
import { calculateBalances, simplifyDebts } from "@/utils/algorithm";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import { Clock, CheckCircle2, PartyPopper } from "lucide-react";

type Props = {
  event: any;
};

export default function SettlementTabClient({ event }: Props) {
  const { id: eventId, title, baseCurrency, participants, expenses, settlements } = event;
  const t = useTranslations("settlement");
  const { identity } = useParticipantIdentity(participants);
  const currentParticipantId = identity?.participantId || null;

  // Calculate smart settlements locally
  const participantIds = participants.map((p: any) => p.id);
  const balances = useMemo(() => calculateBalances(participantIds, expenses), [participantIds, expenses]);
  const transactions = useMemo(() => simplifyDebts(balances), [balances]);

  const participantMap = new Map<string, any>(participants.map((p: any) => [p.id, p]));

  // 1. Gắn thêm state từ DB vào từng transaction
  const enrichedTransactions = useMemo(() => {
    return transactions.map(t => {
      const dbSettlement = settlements?.find(
        (s: any) => s.fromId === t.from && s.toId === t.to && s.amount === t.amount && s.status !== "PENDING"
      ) || null;

      return {
        fromId: t.from,
        fromName: participantMap.get(t.from)?.name || "Unknown",
        toId: t.to,
        toName: participantMap.get(t.to)?.name || "Unknown",
        amount: t.amount,
        dbSettlement,
      };
    });
  }, [transactions, settlements, participantMap]);

  // 2. Phân loại: Hoàn tất (CONFIRMED) và Chờ xử lý (Còn lại)
  const completedTxs = enrichedTransactions.filter(tx => tx.dbSettlement?.status === "CONFIRMED");
  const pendingTxs = enrichedTransactions.filter(tx => tx.dbSettlement?.status !== "CONFIRMED");

  // 3. Sắp xếp Pending: Đẩy giao dịch của TÔI lên đầu tiên
  const sortedPendingTxs = [...pendingTxs].sort((a, b) => {
    const aIsMe = a.fromId === currentParticipantId || a.toId === currentParticipantId;
    const bIsMe = b.fromId === currentParticipantId || b.toId === currentParticipantId;
    if (aIsMe && !bIsMe) return -1;
    if (!aIsMe && bIsMe) return 1;
    return 0;
  });

  if (enrichedTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] p-8 text-center text-slate-500 bg-slate-50 animate-in fade-in duration-500 w-full max-w-xl mx-auto">
        <div className="w-20 h-20 mb-4 rounded-full bg-emerald-100 border-4 border-emerald-50 flex items-center justify-center shadow-sm">
          <PartyPopper className="w-10 h-10 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{t("allSettledTitle")}</h3>
        <p className="text-sm font-medium text-slate-500 leading-relaxed">{t("allSettledDesc")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3 sm:p-6 lg:p-8 pb-36 lg:pb-12 w-full max-w-5xl mx-auto space-y-6 lg:space-y-8">
        
        {/* Nhóm 1: Chờ thanh toán */}
        {sortedPendingTxs.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-lg">{t("pendingSettlements")}</h3>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {sortedPendingTxs.length}
              </span>
            </div>
            
            <div className="flex flex-col gap-3 sm:gap-4">
              {sortedPendingTxs.map((tx, index) => {
                const toParticipant = participantMap.get(tx.toId);
                return (
                  <SettlementRow
                    key={`pending-${index}`}
                    eventId={eventId}
                    eventTitle={title}
                    currency={baseCurrency}
                    currentParticipantId={currentParticipantId}
                    transaction={tx}
                    settlement={tx.dbSettlement}
                    toPaymentInfo={toParticipant?.paymentInfo}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Nhóm 2: Đã hoàn tất */}
        {completedTxs.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-200/80">
            <div className="flex items-center gap-2 px-1 opacity-70">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-700 text-lg">{t("completedSettlements")}</h3>
            </div>
            
            {/* Visual feedback: Làm mờ nhẹ (opacity) các khoản đã xong để đỡ rối mắt */}
            <div className="flex flex-col gap-3 sm:gap-4 opacity-75 hover:opacity-100 transition-opacity">
              {completedTxs.map((tx, index) => {
                const toParticipant = participantMap.get(tx.toId);
                return (
                  <SettlementRow
                    key={`completed-${index}`}
                    eventId={eventId}
                    eventTitle={title}
                    currency={baseCurrency}
                    currentParticipantId={currentParticipantId}
                    transaction={tx}
                    settlement={tx.dbSettlement}
                    toPaymentInfo={toParticipant?.paymentInfo}
                  />
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}