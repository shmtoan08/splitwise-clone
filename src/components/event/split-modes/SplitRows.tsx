"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { splitByShares, splitEvenly } from "@/utils/algorithm";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { User, RotateCcw, Equal, AlertCircle, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

type Participant = {
  id: string;
  name: string;
  weight?: number;
  remainderBurden?: number;
};

type Group = {
  id: string;
  name: string;
  members: { participantId: string }[];
};

type SplitItem = {
  participantId: string;
  amount: number;
  shares?: number | null;
};

type Props = {
  participants: Participant[];
  initialSplits?: SplitItem[];
  initialMode: "AMOUNT" | "SHARES";
  totalAmount: number;
  currency: string;
  originalCurrency?: string;
  groups?: Group[];
  onChange: (mode: "AMOUNT" | "SHARES", splits: SplitItem[], surplus?: number) => void;
  onValidityChange: (valid: boolean) => void;
  isReadOnly?: boolean;
  roundingMode?: "ROUND_ROBIN" | "ROUND_UP";
  initialSurplus?: number;
  isCreator?: boolean;
};

export default function SplitRows({
  participants,
  initialSplits,
  initialMode,
  totalAmount,
  currency,
  originalCurrency,
  groups = [],
  onChange,
  onValidityChange,
  isReadOnly = false,
  roundingMode = "ROUND_ROBIN",
  initialSurplus = 0,
  isCreator = false,
}: Props) {
  const t = useTranslations("expense");
  const tRounding = useTranslations("rounding");
  const displayCurrency = originalCurrency ?? currency;

  // Sort participants so checked ones are at the top initially
  const sortedParticipants = useMemo(() => {
    if (!initialSplits || initialSplits.length === 0) return participants;
    const splitIds = new Set(initialSplits.map(s => s.participantId));
    return [...participants].sort((a, b) => {
      const aSelected = splitIds.has(a.id) ? 1 : 0;
      const bSelected = splitIds.has(b.id) ? 1 : 0;
      return bSelected - aSelected;
    });
  }, [participants, initialSplits]);

  // ─── Init State ─────────────────────────────────────────────────────────────
  const [activeMode, setActiveMode] = useState<"AMOUNT" | "SHARES">(initialMode);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSplits && initialSplits.length > 0) {
      return new Set(initialSplits.map(s => s.participantId));
    }
    return new Set(participants.map(p => p.id));
  });

  // Ở chế độ chỉ xem (isReadOnly): Ẩn hoàn toàn các thành viên không tham gia chia tiền
  const displayedParticipants = useMemo(() => {
    if (isReadOnly) {
      return sortedParticipants.filter(p => selectedIds.has(p.id));
    }
    return sortedParticipants;
  }, [isReadOnly, sortedParticipants, selectedIds]);

  const [sharesMap, setSharesMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const p of participants) {
      const split = initialSplits?.find(s => s.participantId === p.id);
      map[p.id] = split?.shares ?? p.weight ?? 1;
    }
    return map;
  });

  const [amountMap, setAmountMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const p of participants) {
      const split = initialSplits?.find(s => s.participantId === p.id);
      map[p.id] = split?.amount ?? 0;
    }
    return map;
  });

  const [extraIds, setExtraIds] = useState<Set<string>>(new Set());
  const [surplus, setSurplus] = useState<number>(initialSurplus);

  const [isCustomized, setIsCustomized] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // ─── Recalculate helpers ──────────────────────────────────────────────────
  const recalculateAmounts = useCallback((
    currentMode: "AMOUNT" | "SHARES", 
    currentSelectedIds: Set<string>, 
    currentSharesMap: Record<string, number>
  ) => {
    const idsArray = Array.from(currentSelectedIds);
    if (idsArray.length === 0 || totalAmount <= 0) {
      setExtraIds(new Set());
      setSurplus(0);
      return {};
    }

    if (currentMode === "SHARES") {
      const inputs = idsArray
        .map(id => {
          const p = participants.find(part => part.id === id);
          return {
            participantId: id,
            shares: currentSharesMap[id] ?? 0,
            remainderBurden: p?.remainderBurden ?? 0,
          };
        })
        .filter(i => i.shares > 0);

      if (inputs.length === 0) {
        setExtraIds(new Set());
        setSurplus(0);
        return {};
      }

      const results = splitByShares(totalAmount, inputs, roundingMode);
      const newMap: Record<string, number> = {};
      const newExtraIds = new Set<string>();

      for (const r of results.splits) {
        newMap[r.participantId] = r.amount;
        if (r.isExtra) newExtraIds.add(r.participantId);
      }

      setExtraIds(newExtraIds);
      setSurplus(results.surplus);
      return newMap;
    } else {
      const inputs = idsArray.map(id => {
        const p = participants.find(part => part.id === id);
        return { id, remainderBurden: p?.remainderBurden ?? 0 };
      });

      const results = splitEvenly(totalAmount, inputs, roundingMode);
      const newMap: Record<string, number> = {};
      const newExtraIds = new Set<string>();

      for (const r of results.splits) {
        newMap[r.participantId] = r.amount;
        if (r.isExtra) newExtraIds.add(r.participantId);
      }

      setExtraIds(newExtraIds);
      setSurplus(results.surplus);
      return newMap;
    }
  }, [totalAmount, participants, roundingMode]);

  const hasInitialized = useRef(false);
  const prevTotalAmount = useRef(totalAmount);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (!initialSplits || initialSplits.length === 0) {
        const newAmountMap = recalculateAmounts(activeMode, selectedIds, sharesMap);
        setAmountMap(prev => ({ ...prev, ...newAmountMap }));
      }
      return;
    }

    if (prevTotalAmount.current !== totalAmount) {
      prevTotalAmount.current = totalAmount;
      const newAmountMap = recalculateAmounts(activeMode, selectedIds, sharesMap);
      setAmountMap(prev => {
        const next = { ...prev };
        for (const id of Array.from(selectedIds)) {
          next[id] = newAmountMap[id] ?? 0;
        }
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount]);

  // ─── Output Sync ──────────────────────────────────────────────────────────
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const onValidityChangeRef = useRef(onValidityChange);
  useEffect(() => {
    onValidityChangeRef.current = onValidityChange;
  }, [onValidityChange]);

  useEffect(() => {
    const idsArray = Array.from(selectedIds);
    let sum = 0;
    
    const splits = idsArray.map(id => {
      const amount = amountMap[id] ?? 0;
      sum += amount;
      return {
        participantId: id,
        amount: amount,
        shares: activeMode === "SHARES" ? (sharesMap[id] ?? 0) : undefined,
      };
    });

    onChangeRef.current(activeMode, splits, surplus);

    let valid = idsArray.length > 0;
    if (activeMode === "SHARES") {
      const totalShares = idsArray.reduce((acc, id) => acc + (sharesMap[id] ?? 0), 0);
      valid = valid && totalShares > 0;
    } else {
      valid = valid && sum === totalAmount + (surplus || 0);
    }
    onValidityChangeRef.current(valid);
  }, [selectedIds, amountMap, sharesMap, activeMode, totalAmount, surplus]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const isAllSelected = selectedIds.size === participants.length && participants.length > 0;

  const executeAction = useCallback((action: () => void) => {
    if (isCustomized && totalAmount > 0) {
      setPendingAction(() => action);
    } else {
      action();
      setIsCustomized(false);
    }
  }, [isCustomized, totalAmount]);

  const handleConfirm = useCallback(() => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
      setIsCustomized(false);
    }
  }, [pendingAction]);

  const handleCancelConfirm = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleToggleSelectAll = () => {
    executeAction(() => {
      if (isAllSelected) {
        setSelectedIds(new Set());
        setAmountMap({});
      } else {
        const next = new Set(participants.map((p) => p.id));
        setSelectedIds(next);
        const newAmountMap = recalculateAmounts(activeMode, next, sharesMap);
        setAmountMap(newAmountMap);
      }
    });
  };

  const handleToggle = useCallback((participantId: string, checked: boolean) => {
    executeAction(() => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (checked) {
          next.add(participantId);
        } else {
          next.delete(participantId);
        }
        
        const newAmountMap = recalculateAmounts(activeMode, next, sharesMap);
        setAmountMap(am => {
          const nextAm = { ...am };
          for (const id of Array.from(next)) nextAm[id] = newAmountMap[id] ?? 0;
          return nextAm;
        });
        return next;
      });
    });
  }, [executeAction, activeMode, sharesMap, recalculateAmounts]);

  const handleGroupClick = useCallback((group: Group) => {
    if (isReadOnly) return;
    executeAction(() => {
      const groupMemberIds = group.members.map(m => m.participantId);
      const validIds = new Set(groupMemberIds.filter(id => participants.some(p => p.id === id)));
      
      setSelectedIds(validIds);
      
      const newAmountMap = recalculateAmounts(activeMode, validIds, sharesMap);
      setAmountMap(am => {
        const nextAm = { ...am };
        for (const id of Array.from(validIds)) nextAm[id] = newAmountMap[id] ?? 0;
        return nextAm;
      });
    });
  }, [executeAction, participants, activeMode, sharesMap, recalculateAmounts]);

  const handleRestoreShares = useCallback(() => {
    const action = () => {
      setActiveMode("SHARES");
      setSharesMap(prev => {
        const next = { ...prev };
        for (const id of Array.from(selectedIds)) {
          next[id] = participants.find(p => p.id === id)?.weight ?? 1;
        }
        
        const newAmountMap = recalculateAmounts("SHARES", selectedIds, next);
        setAmountMap(am => {
          const nextAm = { ...am };
          for (const sid of Array.from(selectedIds)) nextAm[sid] = newAmountMap[sid] ?? 0;
          return nextAm;
        });
        
        return next;
      });
    };

    if (isCustomized) {
      setPendingAction(() => () => { action(); setIsCustomized(false); });
    } else {
      action();
      setIsCustomized(false);
    }
  }, [isCustomized, selectedIds, participants, recalculateAmounts]);

  const handleEqualSplit = useCallback(() => {
    const action = () => {
      setActiveMode("AMOUNT");
      const newAmountMap = recalculateAmounts("AMOUNT", selectedIds, sharesMap);
      setAmountMap(am => {
        const nextAm = { ...am };
        for (const id of Array.from(selectedIds)) nextAm[id] = newAmountMap[id] ?? 0;
        return nextAm;
      });
    };

    if (isCustomized) {
      setPendingAction(() => () => { action(); setIsCustomized(false); });
    } else {
      action();
      setIsCustomized(false);
    }
  }, [isCustomized, selectedIds, sharesMap, recalculateAmounts]);

  const handleAmountChange = useCallback((participantId: string, val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
    
    setAmountMap(prev => {
      if (prev[participantId] === num) return prev; 
      
      if (activeMode !== "AMOUNT") setActiveMode("AMOUNT");
      setIsCustomized(true);
      
      return { ...prev, [participantId]: num };
    });
  }, [activeMode]);

  const handleSharesChange = useCallback((participantId: string, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, "");
    const num = cleaned === "" ? 0 : parseFloat(cleaned);
    
    setSharesMap(prev => {
      if (prev[participantId] === num) return prev; 
      
      const nextSharesMap = { ...prev, [participantId]: num };
      
      if (activeMode !== "SHARES") setActiveMode("SHARES");
      setIsCustomized(true);
      
      const newAmountMap = recalculateAmounts("SHARES", selectedIds, nextSharesMap);
      setAmountMap(am => {
        const nextAm = { ...am };
        for (const id of Array.from(selectedIds)) nextAm[id] = newAmountMap[id] ?? 0;
        return nextAm;
      });
      
      return nextSharesMap;
    });
  }, [activeMode, selectedIds, recalculateAmounts]);

  const handleRowClick = useCallback((p: Participant) => {
    if (isReadOnly) return;
    if (!selectedIds.has(p.id)) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.add(p.id);
        const newAmountMap = recalculateAmounts(activeMode, next, sharesMap);
        setAmountMap(am => {
          const nextAm = { ...am };
          for (const id of Array.from(next)) nextAm[id] = newAmountMap[id] ?? 0;
          return nextAm;
        });
        return next;
      });
      setIsCustomized(true);
    }
  }, [selectedIds, activeMode, sharesMap, recalculateAmounts]);

  // ─── Render calculations ────────────────────────────────────────────────────
  let currentTotalAmount = 0;
  for (const id of Array.from(selectedIds)) currentTotalAmount += (amountMap[id] ?? 0);
  const left = totalAmount - currentTotalAmount;
  const isExactAmount = totalAmount <= 0 || left === 0;

  let currentTotalShares = 0;
  for (const id of Array.from(selectedIds)) currentTotalShares += (sharesMap[id] ?? 0);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Confirm Dialog */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl p-6 mx-4 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">{t("confirmRecalcTitle", { fallback: "Xác nhận tính lại" })}</p>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">{t("confirmRecalcMessage", { fallback: "Thao tác này sẽ xóa các số liệu bạn đã tùy chỉnh..." })}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 h-11 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-all active:scale-95"
              >
                {t("cancelRecalc", { fallback: "Giữ nguyên" })}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-11 rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
              >
                {t("proceedRecalc", { fallback: "Chia lại" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups (Flex-Split) - Ẩn khi ở chế độ chỉ xem */}
      {groups.length > 0 && !isReadOnly && (
        <div className="flex flex-wrap gap-2 px-1 pt-1">
          {groups.map((g, idx) => {
            const colorVariants = ["bg-slate-100 text-slate-700", "bg-indigo-50 text-indigo-700", "bg-amber-50 text-amber-700"];
            return (
              <Badge
                key={g.id}
                onClick={() => handleGroupClick(g)}
                className={`cursor-pointer transition-opacity border-transparent text-xs font-medium px-2.5 py-1 rounded-md hover:opacity-80 active:scale-95 ${colorVariants[idx % colorVariants.length]}`}
              >
                🏷️ {g.name} ({g.members.length})
              </Badge>
            );
          })}
        </div>
      )}

      {/* Hint & Header Buttons - Ẩn hướng dẫn và nút chỉnh sửa khi chỉ xem */}
      <div className="flex flex-col gap-2 px-1">
        {!isReadOnly && (
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-2 rounded-lg leading-relaxed shadow-inner">
            {activeMode === "AMOUNT" 
              ? t("lockedByAmountHint", { fallback: "Đang chia theo số tiền — bấm Khôi phục tỉ lệ để chỉnh lại tỉ lệ" }) 
              : t("lockedBySharesHint", { fallback: "Đang chia theo tỉ lệ — bấm Chia bằng nhau để chỉnh trực tiếp số tiền" })}
          </div>
        )}
        
        {isReadOnly ? (
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-xs font-bold text-slate-600 tracking-tight">
              {t("splitWith", { count: displayedParticipants.length, fallback: `Đã chia cho ${displayedParticipants.length} người` })}
            </span>
            <div className="text-xs font-bold px-2.5 py-1 rounded-md text-blue-600 bg-blue-50">
              {activeMode === "AMOUNT" 
                ? `${t("total", { fallback: "Tổng" })}: ${formatCurrency(currentTotalAmount, { currency: displayCurrency })}`
                : `${currentTotalShares % 1 === 0 ? currentTotalShares : currentTotalShares.toFixed(2)} ${t("sharesCount", { fallback: "phần" })}`
              }
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className={`flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                  isAllSelected 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
                title={isAllSelected ? t("unselectAll", { fallback: "Bỏ chọn tất cả" }) : t("selectAll", { fallback: "Chọn tất cả" })}
              >
                {isAllSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className="hidden sm:inline">
                  {isAllSelected ? t("unselectAll", { fallback: "Bỏ chọn tất cả" }) : t("selectAll", { fallback: "Chọn tất cả" })}
                </span>
                <span className="inline sm:hidden">
                  {isAllSelected ? t("unselect", { fallback: "Bỏ chọn" }) : t("all", { fallback: "Tất cả" })}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRestoreShares}
                className={`flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                  activeMode === "SHARES" ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t("restoreWeightBtn", { fallback: "Khôi phục tỉ lệ" })}</span>
              </button>

              <button
                type="button"
                onClick={handleEqualSplit}
                className={`flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                  activeMode === "AMOUNT" ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Equal className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t("splitEvenlyBtn", { fallback: "Chia bằng nhau" })}</span>
              </button>
            </div>
            
            <div className={`text-xs font-bold px-2.5 py-1.5 rounded-md shrink-0 ${
              selectedIds.size === 0 || (activeMode === "AMOUNT" && !isExactAmount)
                ? 'text-destructive bg-destructive/10'
                : 'text-blue-600 bg-blue-50'
            }`}>
              {selectedIds.size === 0
                ? t("noParticipantSelected", { fallback: "Vui lòng chọn" })
                : activeMode === "AMOUNT" 
                  ? `${t("total", { fallback: "Tổng" })}: ${formatCurrency(currentTotalAmount, { currency: displayCurrency })} ${!isExactAmount && totalAmount > 0 ? `(${left > 0 ? '+' : ''}${formatCurrency(left, { currency: displayCurrency })})` : ''}`
                  : `${currentTotalShares % 1 === 0 ? currentTotalShares : currentTotalShares.toFixed(2)} ${t("sharesCount", { fallback: "phần" })}`
              }
            </div>
          </div>
        )}
      </div>

      {/* Danh sách participants */}
      <div className="space-y-2 px-1 pb-4 pt-1">
        {displayedParticipants.map((p) => {
          const isSelected = selectedIds.has(p.id);
          const shares = sharesMap[p.id] ?? (p.weight ?? 1);
          const amountVal = amountMap[p.id] ?? 0;

          // Giao diện khi ở chế độ Chỉ xem (isReadOnly)
          if (isReadOnly) {
            return (
              <div
                key={p.id}
                className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2 sm:gap-3"
              >
                <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>

                  {/* Tên */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] sm:text-sm font-semibold text-slate-800 leading-tight line-clamp-2 break-words">
                      {p.name}
                    </p>
                  </div>
                </div>

                {/* Phân bổ (Tỉ lệ & Số tiền) */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {activeMode === "SHARES" && (
                    <>
                      <div className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm text-slate-600 bg-slate-50 border border-slate-200/60">
                        {shares} {t("sharesCount", { fallback: "phần" })}
                      </div>
                      <div className="text-slate-300 font-medium text-xs px-0.5">·</div>
                    </>
                  )}

                  <div className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl flex items-center justify-end font-bold text-xs sm:text-sm text-blue-600 bg-blue-50/60 border border-blue-100">
                    <span>{amountVal === 0 ? "-" : formatCurrency(amountVal, { currency: displayCurrency })}</span>
                    {roundingMode === "ROUND_ROBIN" && extraIds.has(p.id) && amountVal > 0 && (
                      <span className="text-[10px] text-slate-400 font-normal ml-1" title={tRounding("roundRobin")}>
                        (+1{displayCurrency === "JPY" ? "¥" : ""})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // Giao diện khi ở chế độ Chỉnh sửa bình thường
          return (
            <div
              key={p.id}
              onClick={() => handleRowClick(p)}
              className={`bg-white p-2 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 sm:gap-3 cursor-pointer ${
                isSelected
                  ? 'border-blue-300 ring-1 ring-blue-500/10 shadow-sm'
                  : 'border-slate-200/80 shadow-sm opacity-50'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1 min-w-0">
                {/* Checkbox */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleToggle(p.id, !!checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
                />

                {/* Avatar */}
                <div className="hidden sm:flex w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-slate-100 items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                </div>

                {/* Tên */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] sm:text-sm font-semibold text-slate-800 leading-tight line-clamp-2 break-words">
                    {p.name}
                  </p>
                </div>
              </div>

              {/* Các ô nhập (Fixed Auto-zoom iOS) */}
              <div
                className="flex items-center gap-1.5 sm:gap-2 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Ô Tỉ lệ */}
                <div className="w-[4.5rem] sm:w-[5rem] relative">
                  {isSelected && activeMode === "SHARES" ? (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={shares === 0 ? "" : shares}
                      onChange={(e) => handleSharesChange(p.id, e.target.value)}
                      className="w-full h-10 rounded-xl text-center font-bold text-base sm:text-sm text-blue-700 bg-blue-50/50 border-blue-200 focus-visible:ring-blue-600 focus-visible:bg-white px-1 shadow-inner"
                      placeholder="0"
                    />
                  ) : (
                    <div className={`w-full h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-sm px-1 ${isSelected ? 'text-slate-400 bg-slate-50 border border-slate-200/50' : 'text-slate-400'}`}>
                      {activeMode === "AMOUNT" ? "-" : (shares === 0 ? "-" : shares)}
                    </div>
                  )}
                </div>

                {/* Phân cách */}
                <div className="text-slate-300 font-medium text-xs sm:text-sm px-0.5">x</div>

                {/* Ô Số tiền */}
                <div className="w-[6rem] sm:w-[7.5rem] relative">
                  {isSelected && activeMode === "AMOUNT" ? (
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={amountVal === 0 ? "" : amountVal.toLocaleString()}
                      onChange={(e) => handleAmountChange(p.id, e.target.value)}
                      className="w-full h-10 rounded-xl text-right font-bold text-base sm:text-sm text-blue-700 bg-blue-50/50 border-blue-200 focus-visible:ring-blue-600 focus-visible:bg-white px-2 shadow-inner"
                      placeholder="0"
                    />
                  ) : (
                    <div className={`w-full h-10 rounded-xl flex items-center justify-end font-bold text-sm sm:text-sm px-2 ${isSelected ? 'text-slate-700 bg-slate-50 border border-slate-200/50 truncate' : 'text-slate-400 truncate'}`}>
                      <span>{amountVal === 0 ? "-" : formatCurrency(amountVal, { currency: displayCurrency })}</span>
                      {roundingMode === "ROUND_ROBIN" && extraIds.has(p.id) && amountVal > 0 && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1" title={tRounding("roundRobin")}>
                          (+1{displayCurrency === "JPY" ? "¥" : ""})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chú thích tiền dư vào quỹ khi chia ROUND_UP (chỉ hiển thị cho Creator) */}
      {surplus > 0 && isCreator && (
        <div className="mx-1 mb-2 px-3.5 py-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-medium">
            <span>✨</span>
            <span>{tRounding("surplusBadge")}:</span>
          </div>
          <span className="font-bold text-amber-800">
            +{formatCurrency(surplus, { currency: displayCurrency })}
          </span>
        </div>
      )}
    </div>
  );
}