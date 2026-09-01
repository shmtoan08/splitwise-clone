"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { SettlementRow } from "@/components/event/SettlementRow";
import { simplifyDebts } from "@/utils/algorithm";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import { formatCurrency } from "@/lib/utils";
import { updateSeikyuClaimer, toggleEventLock } from "@/actions/event";
import { 
  Clock, 
  CheckCircle2, 
  PartyPopper, 
  Receipt, 
  Users, 
  Wallet, 
  CreditCard,
  Building2,
  ArrowRight,
  Loader2,
  Sparkles,
  UserCheck,
  Lock,
  Unlock,
  Search,
  X,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  event: any;
  isCreator?: boolean;
};

export default function SettlementTabClient({ event, isCreator = false }: Props) {
  const { id: eventId, title, baseCurrency, participants, expenses, settlements, isAdvancedMode, seikyuClaimerId } = event;
  const t = useTranslations("settlement");
  const tCommon = useTranslations("common");
  const tRounding = useTranslations("rounding");
  const { identity } = useParticipantIdentity(participants);
  const currentParticipantId = identity?.participantId || null;
  const [searchQuery, setSearchQuery] = useState("");
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const [claimerId, setClaimerId] = useState<string | undefined>(event.seikyuClaimerId || undefined);
  const [settlementMode, setSettlementMode] = useState<"AUTO" | "CLAIMER">(() => (event.seikyuClaimerId ? "CLAIMER" : "AUTO"));
  const [isPending, startTransition] = useTransition();

  const totalSurplus = useMemo(() => {
    return expenses.reduce((sum: number, ex: any) => sum + (ex.surplus || 0), 0);
  }, [expenses]);

  const [isLocked, setIsLocked] = useState<boolean>(!!event.isLocked);
  const [isLockPending, startLockTransition] = useTransition();

  useEffect(() => {
    setIsLocked(!!event.isLocked);
  }, [event.isLocked]);

  const handleToggleLock = (checked: boolean) => {
    setIsLocked(checked);
    startLockTransition(async () => {
      const res = await toggleEventLock(eventId, checked);
      if (!res.success) {
        setIsLocked(!checked);
      }
    });
  };

  // Xử lý lưu claimerId vào DB khi chọn
  const handleClaimerChange = (val: string | null) => {
    const newClaimerId = val === "none" || !val ? "" : val;
    setClaimerId(newClaimerId || undefined);
    if (newClaimerId) {
      setSettlementMode("CLAIMER");
    } else {
      setSettlementMode("AUTO");
    }

    startTransition(async () => {
      await updateSeikyuClaimer({
        eventId,
        claimerId: newClaimerId || null,
      });
    });
  };

  // 1. TÍNH TOÁN THỐNG KÊ TỔNG QUAN
  const stats = useMemo(() => {
    const realParticipants = participants.filter((p: any) => p.name !== "🏢 Quỹ Công ty");
    const actualExpenses = expenses.filter((ex: any) => !ex.isCrossSubsidy);
    
    const totalSpent = actualExpenses.reduce((sum: number, ex: any) => sum + ex.amount, 0);
    const totalShares = realParticipants.reduce((sum: number, p: any) => sum + (p.weight || 1), 0);
    const avgSpent = totalShares > 0 ? totalSpent / totalShares : 0;
    
    const totalBudget = realParticipants.reduce((sum: number, p: any) => 
      sum + (p.budgetMode === "FIXED" ? (p.budget || 0) : 0)
    , 0);

    return { totalSpent, avgSpent, totalBudget, totalShares, realParticipants };
  }, [participants, expenses]);

  // 2. LÕI TÍNH TOÁN SMART SETTLEMENT
  const { balances, companyCoveredSum, seikyuTransaction } = useMemo(() => {
    const paidMap = new Map<string, number>();
    const owedMap = new Map<string, number>();
    const subsidyMap = new Map<string, number>();

    participants.forEach((p: any) => {
      paidMap.set(p.id, 0);
      owedMap.set(p.id, 0);
    });

    const fundId = participants.find((p: any) => p.name === "🏢 Quỹ Công ty")?.id;
    const virtualFundId = fundId || "virtual-fund";

    if (!paidMap.has(virtualFundId)) paidMap.set(virtualFundId, 0);
    if (!owedMap.has(virtualFundId)) owedMap.set(virtualFundId, 0);

    expenses.forEach((ex: any) => {
      if (ex.isCrossSubsidy) {
        ex.splits.forEach((s: any) => {
          subsidyMap.set(s.participantId, (subsidyMap.get(s.participantId) || 0) + s.amount);
        });
      } else {
        paidMap.set(ex.payerId, (paidMap.get(ex.payerId) || 0) + ex.amount);
        ex.splits.forEach((s: any) => {
          owedMap.set(s.participantId, (owedMap.get(s.participantId) || 0) + s.amount);
        });
      }
    });

    const finalBalances: Record<string, number> = {};
    let coveredSum = 0;

    participants.forEach((p: any) => {
      let paid = paidMap.get(p.id) || 0;
      let owed = owedMap.get(p.id) || 0;
      let subsidy = subsidyMap.get(p.id) || 0;

      if (isAdvancedMode && p.id !== virtualFundId) {
        let companyCovered = 0;
        
        if (p.budgetMode === "UNLIMITED") {
          companyCovered = owed;
        } else if (p.budgetMode === "FIXED") {
          companyCovered = Math.min(owed, p.budget || 0) + subsidy;
        }

        coveredSum += companyCovered;
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

    let seikyuTransaction = null;
    if (claimerId && finalBalances[virtualFundId]) {
      const fundBal = finalBalances[virtualFundId];
      
      seikyuTransaction = {
        isCompanyClaim: true,
        fromId: virtualFundId,
        fromName: t("companyFundName", { fallback: "🏢 Quỹ Công ty" }),
        toId: claimerId,
        toName: participants.find((p: any) => p.id === claimerId)?.name || t("representativeFallback", { fallback: "Đại diện" }),
        amount: Math.abs(fundBal)
      };

      finalBalances[claimerId] = (finalBalances[claimerId] || 0) + fundBal;
      delete finalBalances[virtualFundId];
    }

    const balanceArray = Object.entries(finalBalances).map(([id, balance]) => ({
      id,
      balance
    }));

    return { balances: balanceArray, companyCoveredSum: coveredSum, seikyuTransaction };
  }, [participants, expenses, isAdvancedMode, claimerId, t]);

  // 3. Chạy thuật toán đối trừ
  const transactions = useMemo(() => {
    if (settlementMode === "CLAIMER" && claimerId) {
      const txs: { from: string; to: string; amount: number }[] = [];
      for (const { id, balance } of balances) {
        if (id === claimerId) continue;
        if (balance < 0) {
          txs.push({ from: id, to: claimerId, amount: Math.abs(balance) });
        } else if (balance > 0) {
          txs.push({ from: claimerId, to: id, amount: balance });
        }
      }
      return txs;
    }
    return simplifyDebts(balances);
  }, [balances, settlementMode, claimerId]);

  const participantMap = useMemo(() => {
    const map = new Map<string, any>(participants.map((p: any) => [p.id, p]));
    if (!map.has("virtual-fund")) {
      map.set("virtual-fund", { id: "virtual-fund", name: t("companyFundName", { fallback: "🏢 Quỹ Công ty" }) });
    }
    return map;
  }, [participants, t]);

  const enrichedTransactions = useMemo(() => {
    return transactions.map(tx => {
      const dbSettlement = settlements?.find(
        (s: any) => s.fromId === tx.from && s.toId === tx.to && s.amount === tx.amount && s.status !== "PENDING"
      ) || null;

      return {
        fromId: tx.from,
        fromName: participantMap.get(tx.from)?.name || "Unknown",
        toId: tx.to,
        toName: participantMap.get(tx.to)?.name || "Unknown",
        amount: tx.amount,
        dbSettlement,
      };
    });
  }, [transactions, settlements, participantMap]);

  const filteredEnrichedTransactions = useMemo(() => {
    if (!searchQuery.trim()) return enrichedTransactions;
    const q = searchQuery.toLowerCase().trim();
    return enrichedTransactions.filter(
      tx => tx.fromName.toLowerCase().includes(q) || tx.toName.toLowerCase().includes(q)
    );
  }, [enrichedTransactions, searchQuery]);

  const completedTxs = filteredEnrichedTransactions.filter(tx => tx.dbSettlement?.status === "CONFIRMED");
  const pendingTxs = filteredEnrichedTransactions.filter(tx => tx.dbSettlement?.status !== "CONFIRMED");

  const sortedPendingTxs = [...pendingTxs].sort((a, b) => {
    const aIsMe = a.fromId === currentParticipantId || a.toId === currentParticipantId;
    const bIsMe = b.fromId === currentParticipantId || b.toId === currentParticipantId;
    if (aIsMe && !bIsMe) return -1;
    if (!aIsMe && bIsMe) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* --- THANH TÌM KIẾM (STICKY HEADER) --- */}
      {enrichedTransactions.length > 0 && (
        <div className="shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-200/60 z-20 px-3 sm:px-6 py-2.5 sm:py-3 shadow-sm">
          <div className="max-w-5xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder={t("searchPlaceholder", { fallback: "Tìm theo tên người nợ hoặc người nhận..." })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 sm:px-6 py-4 pb-8 sm:pb-12 lg:pb-16 w-full max-w-5xl mx-auto space-y-4">
        
        {/* === CARD QUỸ DƯ SỰ KIỆN (NẾU CÓ SURPLUS > 0 VÀ LÀ CREATOR) === */}
        {isCreator && totalSurplus > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-orange-400/10 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-4.5 shadow-sm space-y-1.5 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">💎</span>
                <h4 className="font-bold text-amber-950 text-sm sm:text-base">
                  {tRounding("surplusFundTitle", { fallback: "Quỹ dư sự kiện" })}
                </h4>
              </div>
              <span className="font-extrabold text-amber-900 text-base sm:text-lg">
                +{formatCurrency(totalSurplus, { currency: baseCurrency })}
              </span>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed font-medium pl-7">
              {tRounding("surplusFundDesc", { fallback: "Tiền dôi ra từ các lần làm tròn lên. Người đại diện có thể tùy ý sử dụng bù phí chuyển khoản hoặc chi phí chung." })}
            </p>
          </div>
        )}

        {/* === 1. THỐNG KÊ TỔNG QUAN (THU GỌN / MỞ RỘNG) === */}
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setIsOverviewOpen(!isOverviewOpen)}
            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-200/60 active:scale-[0.99] transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-slate-950">
                {t("overviewTitle", { fallback: "Tổng quan sự kiện" })}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              {!isOverviewOpen && (
                <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                  {formatCurrency(stats.totalSpent, { currency: baseCurrency })}
                </span>
              )}
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOverviewOpen ? "rotate-180" : ""}`} />
              </div>
            </div>
          </button>
          
          {/* Grid thống kê tổng quan (Thu gọn / Sổ ra) */}
          {isOverviewOpen && (
            <div className={`grid gap-2 sm:gap-3 ${isAdvancedMode ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"} animate-in fade-in-50 slide-in-from-top-1 duration-200`}>
              {/* Card 1: Tổng chi tiêu */}
              <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1 truncate">
                  <Receipt className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{t("totalSpent", { fallback: "Tổng chi tiêu" })}</span>
                </span>
                <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono sm:font-sans truncate">
                  {formatCurrency(stats.totalSpent, { currency: baseCurrency })}
                </span>
              </div>
              
              {/* Card 2: Trung bình/người */}
              <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1 truncate">
                  <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span className="truncate">{t("avgPerPerson", { fallback: "Trung bình/phần" })}</span>
                </span>
                <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono sm:font-sans truncate">
                  {formatCurrency(stats.avgSpent, { currency: baseCurrency })}
                </span>
              </div>

              {isAdvancedMode && (
                <>
                  {/* Card 3: Tổng ngân sách */}
                  <div className="bg-emerald-50/60 p-3 sm:p-3.5 rounded-2xl border border-emerald-200/80 shadow-sm flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700/90 mb-1 truncate">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{t("totalBudget", { fallback: "Ngân sách" })}</span>
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono sm:font-sans truncate">
                      {formatCurrency(stats.totalBudget, { currency: baseCurrency })}
                    </span>
                  </div>

                  {/* Card 4: Ngân sách đã dùng */}
                  <div className="bg-blue-50/60 p-3 sm:p-3.5 rounded-2xl border border-blue-200/80 shadow-sm flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700/90 mb-1 truncate">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{t("budgetUsed", { fallback: "Đã dùng quỹ" })}</span>
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-blue-700 font-mono sm:font-sans truncate">
                      {formatCurrency(companyCoveredSum, { currency: baseCurrency })}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* === 2. CÀI ĐẶT NGƯỜI ĐẠI DIỆN (NÂNG CẤP: COMPACT INLINE) === */}
        {stats.realParticipants.length > 0 && (isCreator || claimerId) && (
          <section className="bg-white border border-blue-200/80 rounded-2xl p-3 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  {isAdvancedMode && companyCoveredSum > 0 ? <Building2 className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {isAdvancedMode && companyCoveredSum > 0 
                    ? t("disburseThrough", { fallback: "Giải ngân qua:" }) 
                    : t("collectOnBehalf", { fallback: "Người thu hộ:" })}
                </span>
              </div>
              
              <div className="flex-1 max-w-[180px]">
                {isCreator ? (
                  <Select value={claimerId || "none"} onValueChange={handleClaimerChange}>
                    <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border-slate-200 focus:ring-blue-600 font-semibold shadow-none rounded-lg px-2">
                      {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1 text-blue-500" />}
                      <SelectValue placeholder={t("selectPersonPlaceholder", { fallback: "Chọn người..." })}>
                        {claimerId ? stats.realParticipants.find((p: any) => p.id === claimerId)?.name : "---"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="font-medium text-slate-400 text-xs">
                        {t("noSelection", { fallback: "-- Không chọn --" })}
                      </SelectItem>
                      {stats.realParticipants.map((p: any) => (
                        <SelectItem key={p.id} value={p.id} className="font-medium text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-8 flex items-center justify-end px-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs font-extrabold text-blue-700 truncate">
                      {claimerId ? stats.realParticipants.find((p: any) => p.id === claimerId)?.name : "---"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-info giao dịch công ty (Chỉ hiện nếu có) */}
            {isAdvancedMode && seikyuTransaction && claimerId && (
               <div className="flex items-center justify-between bg-blue-50/50 rounded-lg py-1.5 px-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">
                      {t("companyFundName", { fallback: "🏢 Quỹ Công ty" })}
                    </span>
                    <ArrowRight className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-700">{seikyuTransaction.toName}</span>
                  </div>
               </div>
            )}
          </section>
        )}

        {/* === 3. DANH SÁCH GIAO DỊCH (SETTLEMENT ROWS) === */}
        {enrichedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-white border border-slate-200/80 rounded-3xl shadow-sm animate-in fade-in duration-500 mt-4">
            <div className="w-16 h-16 mb-3 rounded-full bg-emerald-100 border-4 border-emerald-50 flex items-center justify-center shadow-sm">
              <PartyPopper className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{t("allSettledTitle")}</h3>
            <p className="text-xs font-medium text-slate-500">{t("allSettledDesc")}</p>
          </div>
        ) : filteredEnrichedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-white border border-slate-200/80 rounded-3xl shadow-sm animate-in fade-in duration-300">
            <Search className="w-8 h-8 text-slate-300 mb-2" />
            <p className="font-medium text-sm text-slate-600">{t("searchEmpty", { fallback: "Không tìm thấy khoản thanh toán phù hợp." })}</p>
            <Button variant="link" onClick={() => setSearchQuery("")} className="text-blue-600 font-semibold text-xs mt-1">
              {tCommon("clearFilter", { fallback: "Xóa tìm kiếm" })}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            
            {/* CẦN THANH TOÁN */}
            {sortedPendingTxs.length > 0 && (
              <section className="space-y-3">
                {/* Header danh sách & Switch gom vào 1 dòng */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-slate-900 text-[15px]">{t("pendingSettlements", { fallback: "Cần thanh toán" })}</h3>
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {sortedPendingTxs.length}
                    </span>
                  </div>

                  {/* Nhúng gọn Switch Tự động/Đại diện vào đây */}
                  {claimerId && (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold uppercase ${settlementMode === "AUTO" ? "text-blue-600" : "text-slate-400"}`}>
                        {t("modeDirect", { fallback: "Gốc" })}
                      </span>
                      <Switch 
                        checked={settlementMode === "CLAIMER"} 
                        onCheckedChange={(c) => setSettlementMode(c ? "CLAIMER" : "AUTO")}
                        className="scale-75 origin-right data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-blue-400"
                      />
                      <span className={`text-[9px] font-bold uppercase ${settlementMode === "CLAIMER" ? "text-indigo-600" : "text-slate-400"}`}>
                        {t("modeCombined", { fallback: "Gom" })}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2.5">
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
                        isReadOnly={!!claimerId && settlementMode === "AUTO"}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* ĐÃ HOÀN TẤT */}
            {completedTxs.length > 0 && (
              <section className="space-y-3 pt-4 border-t border-slate-200/80">
                <div className="flex items-center gap-2 px-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-bold text-slate-700 text-[15px]">{t("completedSettlements", { fallback: "Đã hoàn tất" })}</h3>
                </div>
                
                <div className="flex flex-col gap-2.5 opacity-60 hover:opacity-100 transition-opacity">
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
                        isReadOnly={!!claimerId && settlementMode === "AUTO"}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* CARD KHÓA SỰ KIỆN (CHỈ DÀNH CHO CREATOR) */}
        {isCreator && (
          <div className={`mt-8 p-4 rounded-2xl border transition-all ${
            isLocked 
              ? "bg-rose-50/80 border-rose-200 shadow-sm" 
              : "bg-slate-50 border-slate-200"
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <span>{isLocked ? t("eventLocked", { fallback: "Sự kiện đang khóa" }) : t("lockEvent", { fallback: "Khóa sự kiện" })}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isLocked 
                    ? t("lockedDesc", { fallback: "Không ai có thể thêm mới hay sửa chi tiêu. Chỉ bạn mới có thể mở khóa." })
                    : t("lockDesc", { fallback: "Khóa để chốt sổ, ngăn thành viên thay đổi dữ liệu chi tiêu và thành viên." })}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isLockPending && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                <Switch 
                  checked={isLocked} 
                  onCheckedChange={handleToggleLock} 
                  disabled={isLockPending}
                  className={isLocked ? "data-[state=checked]:bg-rose-500" : ""}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}