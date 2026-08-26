"use client";

import { useState, useEffect } from "react";

import { useTranslations } from "next-intl";
import { getEventSummary } from "@/actions/event";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, ArrowRight, PartyPopper, Loader2, TrendingUp, TrendingDown, Minus, Download } from "lucide-react";



// ── Types ──────────────────────────────────────────────────────────────────

type MemberStat = {
  id: string;
  name: string;
  isMe: boolean;
  paid: number;
  owed: number;
  balance: number;
};

type Settlement = {
  fromId: string;
  fromName: string;
  isFromMe: boolean;
  toId: string;
  toName: string;
  isToMe: boolean;
  amount: number;
};

type SummaryData = {
  currency: string;
  memberStats: MemberStat[];
  settlements: Settlement[];
  hasExpenses: boolean;
};

// ── Main Component ─────────────────────────────────────────────────────────

type Props = {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function EventQuickViewModal({ eventId, eventTitle, open, onOpenChange }: Props) {
  const t = useTranslations("quickView");
  const tCommon = useTranslations("common");
  const [data, setData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch khi dialog mở — dùng useEffect để đảm bảo luôn trigger kể cả lần đầu
  useEffect(() => {
    if (open && !data && !isLoading) {
      setIsLoading(true);
      setError(null);
      getEventSummary(eventId).then((res) => {
        setIsLoading(false);
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error === "unauthorized" ? t("errorUnauthorized") : t("errorSystem"));
        }
      });
    }
  }, [open, eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = "\uFEFF"; // BOM for Excel

    // Part 1: Balances
    csvContent += `${t("balancesTitle")}\n`;
    csvContent += `${t("csvNameCol")},${t("csvPaidCol")},${t("csvOwedCol")},${t("csvBalanceCol")}\n`;
    
    data.memberStats.forEach((m) => {
      // Wrap name in quotes to handle commas
      csvContent += `"${m.name}",${m.paid},${m.owed},${m.balance}\n`;
    });
    
    csvContent += "\n";
    
    // Part 2: Settlements
    csvContent += `${t("settlementsTitle")}\n`;
    csvContent += `${t("csvFromCol")},${t("csvAmountCol")},${t("csvToCol")}\n`;
    
    if (data.settlements.length === 0) {
      csvContent += `${t("allSettled")}\n`;
    } else {
      data.settlements.forEach((s) => {
        csvContent += `"${s.fromName}",${s.amount},"${s.toName}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `group-summary-${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="w-full sm:max-w-lg rounded-3xl p-0 overflow-hidden flex flex-col gap-0 max-h-[85vh] sm:max-h-[80vh]"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-slate-100">
          <DialogTitle className="text-lg font-bold text-slate-900 truncate pr-6">
            {eventTitle}
          </DialogTitle>
          <p className="text-xs text-slate-400 font-medium mt-0.5">{t("subtitle")}</p>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-5">
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-sm font-medium">{tCommon("loading")}</span>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <span className="text-3xl">🔒</span>
              </div>
              <p className="text-sm font-medium text-slate-500 text-center">{error}</p>
            </div>
          )}

          {/* No expenses empty state */}
          {!isLoading && data && !data.hasExpenses && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-slate-500 text-center">{t("noExpenses")}</p>
            </div>
          )}

          {/* Content */}
          {!isLoading && data && data.hasExpenses && (
            <>
              {/* Section 1: Bảng cân đối */}
              <section className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  {t("balancesTitle")}
                </h3>
                <div className="space-y-2">
                  {data.memberStats.map((m) => {
                    const isPositive = m.balance > 0;
                    const isNegative = m.balance < 0;
                    const BalanceIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
                    const balanceColor = isNegative
                      ? "text-rose-600"
                      : isPositive
                      ? "text-emerald-600"
                      : "text-slate-500";
                    const balanceBg = isNegative
                      ? "bg-rose-50 border-rose-100"
                      : isPositive
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-slate-50 border-slate-100";

                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border ${balanceBg}`}
                      >
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full shadow-sm flex items-center justify-center shrink-0 ${m.isMe ? 'bg-emerald-600 border-2 border-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                          {m.isMe ? <User className="w-4 h-4" /> : <span className="text-sm font-bold">{m.name.charAt(0).toUpperCase()}</span>}
                        </div>

                        {/* Name + details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{m.name}</p>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {t("paid")}: <span className="text-slate-600 font-semibold">{formatCurrency(m.paid, { currency: data.currency })}</span>
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {t("owed")}: <span className="text-slate-600 font-semibold">{formatCurrency(m.owed, { currency: data.currency })}</span>
                            </span>
                          </div>
                        </div>

                        {/* Balance */}
                        <div className={`flex items-center gap-1 font-extrabold text-sm ${balanceColor} shrink-0`}>
                          <BalanceIcon className="w-3.5 h-3.5" />
                          {isPositive && "+"}
                          {formatCurrency(m.balance, { currency: data.currency })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Section 2: Thanh toán */}
              <section className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  {t("settlementsTitle")}
                </h3>
                {data.settlements.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <PartyPopper className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-sm font-semibold text-emerald-700">{t("allSettled")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.settlements.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm"
                      >
                        {/* From */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${s.isFromMe ? 'bg-emerald-600 border-2 border-emerald-500 text-white' : 'bg-rose-50 border border-rose-100 text-rose-500'}`}>
                          {s.isFromMe ? <User className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">{s.fromName.charAt(0).toUpperCase()}</span>}
                        </div>
                        <span className={`font-bold text-sm truncate max-w-[80px] ${s.isFromMe ? 'text-emerald-700' : 'text-slate-800'}`}>{s.fromName}</span>

                        {/* Arrow + Amount */}
                        <div className="flex flex-col items-center flex-1 px-1">
                          <span className="text-[11px] font-bold text-blue-600">{formatCurrency(s.amount, { currency: data.currency })}</span>
                          <ArrowRight className="w-4 h-4 text-slate-300 mt-0.5" />
                        </div>

                        {/* To */}
                        <span className={`font-bold text-sm truncate max-w-[80px] text-right ${s.isToMe ? 'text-emerald-700' : 'text-slate-800'}`}>{s.toName}</span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${s.isToMe ? 'bg-emerald-600 border-2 border-emerald-500 text-white' : 'bg-emerald-50 border border-emerald-100 text-emerald-500'}`}>
                          {s.isToMe ? <User className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">{s.toName.charAt(0).toUpperCase()}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer with Export Action */}
        {!isLoading && data && data.hasExpenses && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 mt-auto shrink-0 flex justify-between gap-3">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1 rounded-full border-slate-200 bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all font-medium shadow-sm">
              {tCommon("close") || "Đóng"}
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="flex-[1.5] flex items-center gap-2 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition-all">
              <Download className="w-4 h-4" />
              {t("exportCsv")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
