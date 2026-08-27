"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { applyCrossSubsidy, removeCrossSubsidy } from "@/actions/budget";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { User, Loader2 } from "lucide-react";
import ParticipantDetailsModal from "./ParticipantDetailsModal";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";


type Props = {
  event: any;
};

export default function BalancesTabClient({ event }: Props) {
  const { id: eventId, isAdvancedMode, participants, expenses, baseCurrency } = event;
  const t = useTranslations("budget");
  const { isCurrentParticipant } = useParticipantIdentity(participants);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);


  const hasCrossSubsidyApplied = expenses.some((e: any) => e.isCrossSubsidy);
  const [autoApply, setAutoApply] = useState(hasCrossSubsidyApplied);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  // Compute values
  const statsMap = new Map<string, { paid: number; owed: number }>();
  participants.forEach((p: any) => {
    statsMap.set(p.id, { paid: 0, owed: 0 });
  });

  expenses.forEach((ex: any) => {
    const currentPayer = statsMap.get(ex.payerId);
    if (currentPayer) {
      currentPayer.paid += ex.amount;
    }
    
    ex.splits.forEach((s: any) => {
      const currentSplit = statsMap.get(s.participantId);
      if (currentSplit) {
        currentSplit.owed += s.amount;
      }
    });
  });

  const realParticipants = participants.filter((p: any) => p.name !== "🏢 Quỹ Công ty");

  const handleApplyCrossSubsidy = () => {
    startTransition(async () => {
      setError(null);
      if (autoApply) {
        const res = await applyCrossSubsidy(eventId);
        if (!res.success) {
          setError(res.error);
        }
      } else {
        const res = await removeCrossSubsidy(eventId);
        if (!res.success) {
          setError(res.error);
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 sm:px-6 py-4 pb-36 lg:pb-12 w-full max-w-5xl mx-auto space-y-3 sm:space-y-4">
        
        {/* Hướng dẫn ngắn */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-2">
           <h3 className="text-sm font-bold text-slate-800 mb-1">{t("balanceBoard")}</h3>
           <p className="text-xs text-slate-500 font-medium">
             {isAdvancedMode 
               ? t("balanceDescAdvanced") 
               : t("balanceDescNormal")}
           </p>
        </div>


        {/* Danh sách Thẻ Quyết Toán */}
        <div className="space-y-3">
          {realParticipants.map((p: any) => {
            const stats = statsMap.get(p.id) || { paid: 0, owed: 0 };
            
            let balance = 0;
            if (isAdvancedMode) {
              const budget = p.budgetMode === "FIXED" ? (p.budget || 0) : 0;
              balance = budget - stats.owed;
            } else {
              balance = stats.paid - stats.owed;
            }

            // Phân loại màu: Âm = Đỏ, Dương = Xanh ngọc, Hòa = Xám
            const balanceColor = balance < 0 ? "text-rose-600" : balance > 0 ? "text-emerald-600" : "text-slate-600";
            const budgetDisplay = p.budgetMode === "FIXED" ? p.budget : p.budgetMode === "UNLIMITED" ? "∞" : "-";

            const isMe = isCurrentParticipant(p.id);

            return (
              <div 
                key={p.id} 
                onClick={() => setSelectedParticipantId(p.id)}
                className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 cursor-pointer ${
                  isMe
                    ? "bg-emerald-50/60 border-emerald-300/80 shadow-sm ring-1 ring-emerald-500/10"
                    : "bg-white border-slate-200/80 shadow-sm hover:shadow-md"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                      isMe 
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isMe ? <User size={20} /> : p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900 text-base">{p.name}</span>
                  </div>
                  <div className="text-right flex flex-col items-end justify-center">
                    <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${balanceColor}`}>
                      {balance > 0 ? "+" : ""}{formatCurrency(balance, { currency: baseCurrency })}
                    </span>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase mt-0.5">{t("balanceLabel")}</span>
                  </div>
                </div>


                <div className={`grid grid-cols-2 gap-2 text-xs sm:text-sm p-3 rounded-xl border ${
                  isMe ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-100"
                }`}>
                  {isAdvancedMode && (
                    <div className={`col-span-2 flex justify-between items-center border-b pb-2 mb-1 ${
                      isMe ? "border-emerald-200" : "border-slate-200/80"
                    }`}>
                      <span className={`font-medium ${isMe ? "text-emerald-700" : "text-slate-500"}`}>{t("budgetProvided")}</span>
                      <span className="font-bold text-slate-700">
                        {typeof budgetDisplay === "number" ? formatCurrency(budgetDisplay, { currency: baseCurrency }) : budgetDisplay}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <span className={`font-medium ${isMe ? "text-emerald-700" : "text-slate-400"}`}>{t("paidAmount")}</span>
                    <span className="font-bold text-slate-700">{formatCurrency(stats.paid, { currency: baseCurrency })}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className={`font-medium ${isMe ? "text-emerald-700" : "text-slate-400"}`}>{t("owedAmount")}</span>
                    <span className="font-bold text-slate-700">{formatCurrency(stats.owed, { currency: baseCurrency })}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Footer: Khu vực Bù đắp chéo (Chỉ hiện ở Chế độ nâng cao) */}
      {isAdvancedMode && (
        <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] z-10 w-full max-w-5xl mx-auto">
          <div className="max-w-md mx-auto flex flex-col gap-3">
            <div className="flex items-start space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <Checkbox 
                id="cross-subsidy" 
                checked={autoApply}
                onCheckedChange={(c) => setAutoApply(!!c)}
                className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="cross-subsidy"
                  className="text-sm font-semibold text-slate-800 cursor-pointer"
                >
                  {t("applyCheckboxLabel")}
                </label>
                <p className="text-[11px] text-slate-500 font-medium leading-tight">{t("crossSubsidyDesc")}</p>
              </div>

            </div>
            {error && <p className="text-xs font-semibold text-rose-500 text-center">{error}</p>}
            <Button 
              onClick={handleApplyCrossSubsidy} 
              disabled={isPending || autoApply === hasCrossSubsidyApplied}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm active:scale-95 transition-all"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : t("confirmAndApply")}
            </Button>

          </div>
        </div>
      )}
      {selectedParticipantId && (() => {
        const p = participants.find((p: any) => p.id === selectedParticipantId);
        if (!p) return null;
        
        const stats = statsMap.get(p.id) || { paid: 0, owed: 0 };
        let balance = 0;
        if (isAdvancedMode) {
          const budget = p.budgetMode === "FIXED" ? (p.budget || 0) : 0;
          balance = budget - stats.owed;
        } else {
          balance = stats.paid - stats.owed;
        }

        return (
          <ParticipantDetailsModal
            open={!!selectedParticipantId}
            onOpenChange={(open) => !open && setSelectedParticipantId(null)}
            participant={p}
            expenses={expenses}
            participants={participants}
            currency={event.baseCurrency}
            balance={balance}
          />
        );
      })()}
    </div>
  );
}