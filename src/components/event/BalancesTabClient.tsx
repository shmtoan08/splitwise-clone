"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { User, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import ParticipantDetailsModal from "./ParticipantDetailsModal";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import { applyCrossSubsidy } from "@/actions/budget";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import FilterSortModal from "@/components/shared/FilterSortModal";

type Props = {
  event: any;
  isCreator?: boolean;
};

export default function BalancesTabClient({ event, isCreator }: Props) {
  const { id: eventId, isAdvancedMode, participants, expenses, baseCurrency } = event;
  const t = useTranslations("budget");
  const { isCurrentParticipant, identity } = useParticipantIdentity(participants);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Tự động bật checkbox nếu trong DB đã tồn tại khoản chi bù đắp chéo
  const [autoApply, setAutoApply] = useState(() => expenses.some((ex: any) => ex.isCrossSubsidy));
  
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  
  const defaultExcluded = useMemo(() => {
    return new Set<string>(
      participants
        .filter((p: any) => p.budgetMode !== "FIXED" && p.name !== "🏢 Quỹ Công ty")
        .map((p: any) => p.id)
    );
  }, [participants]);

  const [excludedSubsidyIds, setExcludedSubsidyIds] = useState<Set<string>>(defaultExcluded);

  // --- FILTER & SORT STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("balance_desc"); // Mặc định: Số dư lớn -> nhỏ
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Compute values
  const statsMap = useMemo(() => {
    const map = new Map<string, { paid: number; owed: number }>();
    participants.forEach((p: any) => {
      map.set(p.id, { paid: 0, owed: 0 });
    });

    expenses.forEach((ex: any) => {
      if (ex.isCrossSubsidy) return;

      const currentPayer = map.get(ex.payerId);
      if (currentPayer) {
        currentPayer.paid += ex.amount;
      }

      ex.splits.forEach((s: any) => {
        const currentSplit = map.get(s.participantId);
        if (currentSplit) {
          currentSplit.owed += s.amount;
        }
      });
    });
    return map;
  }, [participants, expenses]);

  // Calculate cross subsidy in UI
  const { subsidyMap, totalSurplusAvailable, totalOverAvailable } = useMemo(() => {
    const map = new Map<string, number>();
    let surplusAvail = 0;
    let overAvail = 0;

    if (isAdvancedMode) {
      let totalOver = 0;
      let totalSurplus = 0;
      const overList: { id: string; overC: number }[] = [];

      participants.forEach((p: any) => {
        if (p.name === "🏢 Quỹ Công ty") return;

        const stats = statsMap.get(p.id) || { paid: 0, owed: 0 };
        const budget = p.budgetMode === "FIXED" ? (p.budget || 0) : 0;
        const diff = budget - stats.owed;
        
        if (diff < 0) {
          if (!excludedSubsidyIds.has(p.id)) {
            totalOver += (-diff);
            overList.push({ id: p.id, overC: -diff });
          }
        } else if (diff > 0) {
          if (p.budgetMode === "FIXED") {
            totalSurplus += diff;
          }
        }
      });

      surplusAvail = totalSurplus;
      overAvail = totalOver;

      if (autoApply && totalOver > 0 && totalSurplus > 0) {
        const distributeAmount = Math.min(totalSurplus, totalOver);
        let runningTotal = 0;
        overList.forEach((entry, idx) => {
          let sAmount = 0;
          if (idx === overList.length - 1) {
            sAmount = distributeAmount - runningTotal;
          } else {
            sAmount = Math.round(distributeAmount * (entry.overC / totalOver));
            runningTotal += sAmount;
          }
          map.set(entry.id, sAmount);
        });
        
        surplusAvail -= distributeAmount;
        overAvail -= distributeAmount;
      }
    }

    return {
      subsidyMap: map,
      totalSurplusAvailable: surplusAvail,
      totalOverAvailable: overAvail,
    };
  }, [isAdvancedMode, participants, statsMap, excludedSubsidyIds, autoApply]);

  const computeBalance = (p: any, stats: { paid: number; owed: number }) => {
    let actualOwed = stats.owed;
    if (autoApply && isAdvancedMode) {
      actualOwed -= (subsidyMap.get(p.id) || 0);
    }

    if (isAdvancedMode) {
      const budget = p.budgetMode === "FIXED" ? (p.budget || 0) : 0;
      return { balance: budget - actualOwed + stats.paid, actualOwed };
    }
    return { balance: stats.paid - actualOwed, actualOwed };
  };

  // --- THUẬT TOÁN LỌC VÀ SẮP XẾP DANH SÁCH ---
  const processedParticipants = useMemo(() => {
    const realParticipants = participants.filter((p: any) => p.name !== "🏢 Quỹ Công ty");

    // 1. Tính toán dữ liệu balance cho từng người
    const mapped = realParticipants.map((p: any) => {
      const stats = statsMap.get(p.id) || { paid: 0, owed: 0 };
      const { balance, actualOwed } = computeBalance(p, stats);
      const subsidy = subsidyMap.get(p.id) || 0;
      const budget = p.budget || 0;
      const diff = budget - stats.owed;

      return {
        participant: p,
        stats,
        balance,
        actualOwed,
        subsidy,
        budget,
        diff,
      };
    });

    // 2. Lọc theo tên người
    let filtered = mapped;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) => item.participant.name.toLowerCase().includes(q));
    }

    // 3. Sắp xếp
    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case "balance_desc": return b.balance - a.balance; // Số dư lớn -> nhỏ
        case "balance_asc": return a.balance - b.balance;  // Số dư nhỏ -> lớn
        case "name_asc": return a.participant.name.localeCompare(b.participant.name); // Tên A-Z
        case "name_desc": return b.participant.name.localeCompare(a.participant.name); // Tên Z-A
        default: return 0;
      }
    });

    return filtered;
  }, [participants, statsMap, autoApply, isAdvancedMode, subsidyMap, searchQuery, sortBy]);

  const hasActiveFilters = sortBy !== "balance_desc";

  const isLocked = !!event.isLocked;

  const handleToggleCrossSubsidy = (checked: boolean) => {
    if (!isCreator || isLocked) return;
    setAutoApply(checked);
    if (!checked) {
      setExcludedSubsidyIds(defaultExcluded);
    }
  };

  const handleToggleIndividualSubsidy = (e: React.MouseEvent, participantId: string, checked: boolean) => {
    e.stopPropagation();
    if (!isCreator || isLocked) return;
    setExcludedSubsidyIds(prev => {
      const next = new Set(prev);
      if (!checked) {
        next.add(participantId);
      } else {
        next.delete(participantId);
      }
      return next;
    });
  };

  const handleApplyToDB = () => {
    if (isLocked) return;
    const subsidiesToSave: { participantId: string; amount: number }[] = [];

    if (autoApply && isAdvancedMode) {
      subsidyMap.forEach((amount, pId) => {
        if (amount > 0 && !excludedSubsidyIds.has(pId)) {
          subsidiesToSave.push({ participantId: pId, amount });
        }
      });
    }

    startTransition(async () => {
      setError(null);
      const res = await applyCrossSubsidy({
        eventId,
        title: t("crossSubsidyTitle", { fallback: "Bù đắp ngân sách tự động" }),
        subsidies: subsidiesToSave,
      });

      if (!res.success) {
        setError(res.error || "Có lỗi xảy ra");
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* --- THANH TÌM KIẾM & BỘ LỌC (STICKY HEADER) --- */}
      <div className="shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-200/60 z-20 px-3 sm:px-6 py-2.5 sm:py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder={t("searchPlaceholder", { fallback: "Tìm theo tên thành viên..." })}
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
            
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setIsFilterModalOpen(true)}
              className={`w-11 h-11 rounded-xl p-0 relative shrink-0 transition-all ${hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
              )}
            </Button>
          </div>

          {/* HIỂN THỊ CÁC BỘ LỌC ĐANG BẬT */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <Badge variant="secondary" onClick={() => setSortBy("balance_desc")} className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent text-xs px-2.5 py-1 rounded-lg cursor-pointer shrink-0">
                {sortBy === "balance_asc" && t("sortBalanceAsc", { fallback: "Số dư (Nhỏ -> Lớn)" })}
                {sortBy === "name_asc" && t("sortNameAsc", { fallback: "Tên (A -> Z)" })}
                {sortBy === "name_desc" && t("sortNameDesc", { fallback: "Tên (Z -> A)" })}
                <X className="w-3 h-3 ml-1 inline" />
              </Badge>
              <button type="button" onClick={() => setSortBy("balance_desc")} className="text-[11px] font-medium text-slate-400 hover:text-slate-700 whitespace-nowrap ml-1 underline underline-offset-2 shrink-0">
                {t("defaultSort", { fallback: "Mặc định" })}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- NỘI DUNG CHÍNH --- */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 sm:px-6 py-4 pb-6 lg:pb-12 w-full max-w-5xl mx-auto space-y-3 sm:space-y-4">

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <h3 className="text-sm font-bold text-slate-800 mb-1">{t("balanceBoard")}</h3>
              <p className="text-xs text-slate-500 font-medium">
                {isAdvancedMode ? t("balanceDescAdvanced") : t("balanceDescNormal")}
              </p>
            </div>

            {isAdvancedMode && (
              <div className="flex flex-col items-end gap-1.5 shrink-0 pl-3 sm:border-l sm:border-slate-200">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="cross-subsidy"
                    checked={autoApply}
                    onCheckedChange={(c) => handleToggleCrossSubsidy(!!c)}
                    disabled={!isCreator || isLocked}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label
                    htmlFor="cross-subsidy"
                    className={`text-xs font-semibold text-slate-700 select-none ${isCreator && !isLocked ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                  >
                    {t("applyCheckboxLabel")}
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 whitespace-nowrap">
                    {t("totalOverBudget", { fallback: "Tổng âm" })}: {formatCurrency(totalOverAvailable, { currency: baseCurrency })}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">
                    {t("surplusFund", { fallback: "Quỹ dư" })}: {formatCurrency(totalSurplusAvailable, { currency: baseCurrency })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {isAdvancedMode && (
            <p className="text-[11px] text-slate-400 font-medium leading-tight mt-2">
              {t("crossSubsidyDesc")}
            </p>
          )}

          {error && <p className="text-xs font-semibold text-rose-500 mt-2">{error}</p>}

          {isAdvancedMode && (
            <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3">
              <Button
                onClick={handleApplyToDB}
                disabled={isPending || isLocked}
                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {autoApply
                  ? t("saveCrossSubsidy", { fallback: "Lưu & Áp dụng Bù đắp" })
                  : t("clearCrossSubsidy", { fallback: "Xóa Bù đắp chéo" })}
              </Button>
            </div>
          )}
        </div>

        {/* Danh sách Thẻ Quyết Toán */}
        {processedParticipants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm gap-2">
            <Search className="w-8 h-8 text-slate-300" />
            <p className="font-medium">Không tìm thấy thành viên phù hợp.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {processedParticipants.map(({ participant: p, stats, balance, actualOwed, subsidy, budget, diff }: any) => {
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
                        isMe ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200' : 'bg-slate-100 text-slate-600'
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

                  <div className={`grid ${autoApply && isAdvancedMode ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-xs sm:text-sm p-3 rounded-xl border ${
                    isMe ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-100"
                  }`}>
                    {isAdvancedMode && (
                      <div className={`col-span-full flex justify-between items-center border-b pb-2 mb-1 ${
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
                    {autoApply && isAdvancedMode && (
                      <div className="flex flex-col gap-1 text-center border-l border-r border-slate-200/60 px-1">
                        {diff > 0 ? (
                          <>
                            <span className={`font-medium ${isMe ? "text-emerald-700" : "text-emerald-500"}`}>{t("surplusFund", { fallback: "Dư quỹ" })}</span>
                            <span className="font-bold text-emerald-600">
                              +{formatCurrency(diff, { currency: baseCurrency })}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-center gap-1">
                              {diff < 0 && (
                                <Checkbox
                                  checked={!excludedSubsidyIds.has(p.id)}
                                  onCheckedChange={(c) => handleToggleIndividualSubsidy({ stopPropagation: () => {} } as any, p.id, !!c)}
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={!isCreator}
                                  className="w-3.5 h-3.5 border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              )}
                              <span className={`font-medium ${isMe ? "text-emerald-700" : "text-amber-500"}`}>{t("subsidyAmount", { fallback: "Bù đắp" })}</span>
                            </div>
                            <span className={`font-bold ${subsidy > 0 && !excludedSubsidyIds.has(p.id) ? "text-amber-600" : "text-slate-400"}`}>
                              {subsidy > 0 && !excludedSubsidyIds.has(p.id) ? "+" + formatCurrency(subsidy, { currency: baseCurrency }) : "-"}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 text-right">
                      <span className={`font-medium ${isMe ? "text-emerald-700" : "text-slate-400"}`}>{t("owedAmount")}</span>
                      <span className="font-bold text-slate-700">
                        {autoApply && isAdvancedMode && subsidy > 0 ? (
                          <span className="line-through text-slate-400 mr-1 text-[10px]">{formatCurrency(stats.owed, { currency: baseCurrency })}</span>
                        ) : null}
                        {formatCurrency(actualOwed, { currency: baseCurrency })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODAL BỘ LỌC & SẮP XẾP --- */}
      <FilterSortModal
        isOpen={isFilterModalOpen}
        onClose={setIsFilterModalOpen}
        title={t("filterModalTitle", { fallback: "Sắp xếp sổ sách" })}
        sortTitle={t("sortBy", { fallback: "Sắp xếp theo" })}
        sortOptions={[
          { id: "balance_desc", label: t("sortBalanceDesc", { fallback: "Số dư (Lớn nhất -> Nhỏ nhất)" }) },
          { id: "balance_asc", label: t("sortBalanceAsc", { fallback: "Số dư (Nhỏ nhất -> Lớn nhất)" }) },
          { id: "name_asc", label: t("sortNameAsc", { fallback: "Tên (A -> Z)" }) },
          { id: "name_desc", label: t("sortNameDesc", { fallback: "Tên (Z -> A)" }) },
        ]}
        currentSort={sortBy}
        onSortChange={setSortBy}
        // Bỏ trống các prop filter* -> Component sẽ tự động ẩn phần Lọc và render Danh sách Sắp xếp nằm dọc
      />

      {/* Modal Chi tiết cá nhân */}
      {selectedParticipantId && (() => {
        const p = participants.find((p: any) => p.id === selectedParticipantId);
        if (!p) return null;

        const stats = statsMap.get(p.id) || { paid: 0, owed: 0 };
        const { balance } = computeBalance(p, stats);
        const subsidy = (autoApply && isAdvancedMode && !excludedSubsidyIds.has(p.id)) ? (subsidyMap.get(p.id) || 0) : 0;

        return (
          <ParticipantDetailsModal
            open={!!selectedParticipantId}
            onOpenChange={(open) => !open && setSelectedParticipantId(null)}
            participant={p}
            expenses={expenses}
            participants={participants}
            currency={event.baseCurrency}
            balance={balance}
            isAdvancedMode={isAdvancedMode}
            subsidy={subsidy}
            isEventCreator={!!isCreator}
            currentUserId={identity?.participantId}
            eventId={eventId}
            groups={event.groups || []}
          />
        );
      })()}
    </div>
  );
}