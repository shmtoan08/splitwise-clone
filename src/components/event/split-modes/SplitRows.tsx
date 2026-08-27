"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { splitByShares, splitEvenly } from "@/utils/algorithm";
import { useState, useCallback, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { User, RotateCcw, Equal, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

type Participant = {
  id: string;
  name: string;
  weight?: number;
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
  onChange: (mode: "AMOUNT" | "SHARES", splits: SplitItem[]) => void;
  onValidityChange: (valid: boolean) => void;
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
}: Props) {
  const t = useTranslations("expense");
  const displayCurrency = originalCurrency ?? currency;

  // ─── Init State ─────────────────────────────────────────────────────────────
  
  const [activeMode, setActiveMode] = useState<"AMOUNT" | "SHARES">(initialMode);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSplits && initialSplits.length > 0) {
      return new Set(initialSplits.map(s => s.participantId));
    }
    return new Set(participants.map(p => p.id));
  });

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

  const [isCustomized, setIsCustomized] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // ─── Recalculate helpers ──────────────────────────────────────────────────

  const recalculateAmounts = useCallback((currentMode: "AMOUNT" | "SHARES", currentSelectedIds: Set<string>, currentSharesMap: Record<string, number>) => {
    const idsArray = Array.from(currentSelectedIds);
    if (idsArray.length === 0 || totalAmount <= 0) {
      return {};
    }

    if (currentMode === "SHARES") {
      const inputs = idsArray.map(id => ({ participantId: id, shares: currentSharesMap[id] ?? 0 })).filter(i => i.shares > 0);
      if (inputs.length === 0) return {};
      const results = splitByShares(totalAmount, inputs);
      const newMap: Record<string, number> = {};
      for (const r of results) newMap[r.participantId] = r.amount;
      return newMap;
    } else {
      const results = splitEvenly(totalAmount, idsArray);
      const newMap: Record<string, number> = {};
      for (const r of results) newMap[r.participantId] = r.amount;
      return newMap;
    }
  }, [totalAmount]);

  // Recalculate implicitly when totalAmount changes
  const hasInitialized = useRef(false);
  const prevTotalAmount = useRef(totalAmount);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // First render: if no initial splits, calculate them based on initialMode
      if (!initialSplits || initialSplits.length === 0) {
        const newAmountMap = recalculateAmounts(activeMode, selectedIds, sharesMap);
        setAmountMap(prev => ({ ...prev, ...newAmountMap }));
      }
      return;
    }

    // Only recalculate if totalAmount ACTUALLY changed
    if (prevTotalAmount.current !== totalAmount) {
      prevTotalAmount.current = totalAmount;
      const newAmountMap = recalculateAmounts(activeMode, selectedIds, sharesMap);
      setAmountMap(prev => {
        const next = { ...prev };
        // Keep unchecked values as they were, only update checked
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

    onChangeRef.current(activeMode, splits);

    // Validate
    let valid = idsArray.length > 0;
    if (activeMode === "SHARES") {
      const totalShares = idsArray.reduce((acc, id) => acc + (sharesMap[id] ?? 0), 0);
      valid = valid && totalShares > 0;
    } else {
      valid = valid && sum === totalAmount;
    }
    onValidityChangeRef.current(valid);
  }, [selectedIds, amountMap, sharesMap, activeMode, totalAmount]);


  // ─── Handlers ──────────────────────────────────────────────────────────────

  const executeAction = useCallback((action: () => void) => {
    if (isCustomized) {
      setPendingAction(() => action);
    } else {
      action();
      setIsCustomized(true);
    }
  }, [isCustomized]);

  const handleConfirm = useCallback(() => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
      setIsCustomized(true);
    }
  }, [pendingAction]);

  const handleCancelConfirm = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleToggle = useCallback((participantId: string, checked: boolean) => {
    if (!checked) {
      executeAction(() => {
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(participantId);
          
          // Recalculate remaining
          const newAmountMap = recalculateAmounts(activeMode, next, sharesMap);
          setAmountMap(am => {
            const nextAm = { ...am };
            for (const id of Array.from(next)) nextAm[id] = newAmountMap[id] ?? 0;
            return nextAm;
          });
          
          return next;
        });
      });
    } else {
      // Bật lại không cảnh báo xoá dữ liệu người khác (vì đang thêm người vào)
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.add(participantId);
        
        // Recalculate with restored id
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
  }, [executeAction, activeMode, sharesMap, recalculateAmounts]);

  const handleGroupClick = useCallback((group: Group) => {
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
      setPendingAction(() => () => {
        action();
        setIsCustomized(false);
      });
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
      setPendingAction(() => () => {
        action();
        setIsCustomized(false);
      });
    } else {
      action();
      setIsCustomized(false);
    }
  }, [isCustomized, selectedIds, sharesMap, recalculateAmounts]);

  const handleAmountChange = useCallback((participantId: string, val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
    
    setAmountMap(prev => {
      if (prev[participantId] === num) return prev; // Value didn't actually change
      
      if (activeMode !== "AMOUNT") setActiveMode("AMOUNT");
      setIsCustomized(true);
      
      return { ...prev, [participantId]: num };
    });
  }, [activeMode]);

  const handleSharesChange = useCallback((participantId: string, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, "");
    const num = cleaned === "" ? 0 : parseFloat(cleaned);
    
    setSharesMap(prev => {
      if (prev[participantId] === num) return prev; // Value didn't actually change
      
      const nextSharesMap = { ...prev, [participantId]: num };
      
      if (activeMode !== "SHARES") setActiveMode("SHARES");
      setIsCustomized(true);
      
      // Since it's SHARES mode, changing one share automatically recalculates amounts
      const newAmountMap = recalculateAmounts("SHARES", selectedIds, nextSharesMap);
      setAmountMap(am => {
        const nextAm = { ...am };
        for (const id of Array.from(selectedIds)) nextAm[id] = newAmountMap[id] ?? 0;
        return nextAm;
      });
      
      return nextSharesMap;
    });
  }, [activeMode, selectedIds, recalculateAmounts]);

  // ─── Render calculations ────────────────────────────────────────────────────
  
  let currentTotalAmount = 0;
  for (const id of Array.from(selectedIds)) currentTotalAmount += (amountMap[id] ?? 0);
  const left = totalAmount - currentTotalAmount;
  const isExactAmount = totalAmount <= 0 || left === 0;

  let currentTotalShares = 0;
  for (const id of Array.from(selectedIds)) currentTotalShares += (sharesMap[id] ?? 0);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
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

      {/* Groups (Flex-Split) */}
      {groups.length > 0 && (
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

      {/* Hint & Header Buttons */}
      <div className="flex flex-col gap-2 px-1">
        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-2 rounded-lg leading-relaxed shadow-inner">
          {activeMode === "AMOUNT" ? t("lockedByAmountHint", { fallback: "Đang chia theo số tiền — bấm Khôi phục tỉ lệ để chỉnh lại tỉ lệ" }) : t("lockedBySharesHint", { fallback: "Đang chia theo tỉ lệ — bấm Chia bằng nhau để chỉnh trực tiếp số tiền" })}
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreShares}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                activeMode === "SHARES" ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("restoreWeightBtn", { fallback: "Khôi phục tỉ lệ" })}
            </button>
            <button
              type="button"
              onClick={handleEqualSplit}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                activeMode === "AMOUNT" ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <Equal className="w-3.5 h-3.5" />
              {t("splitEvenlyBtn", { fallback: "Chia bằng nhau" })}
            </button>
          </div>
          
          <div className={`text-xs font-bold px-2.5 py-1.5 rounded-md ${
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
      </div>

      {/* Danh sách participants */}
      <div className="space-y-2.5 flex-1 overflow-y-auto scrollbar-hide min-h-[100px] px-1 pb-4 pt-1">
        {participants.map((p) => {
          const isSelected = selectedIds.has(p.id);
          const shares = sharesMap[p.id] ?? (p.weight ?? 1);
          const amountVal = amountMap[p.id] ?? 0;

          return (
            <div
              key={p.id}
              className={`bg-white p-3 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isSelected
                  ? 'border-blue-300 ring-1 ring-blue-500/10 shadow-sm'
                  : 'border-slate-200/80 shadow-sm opacity-50'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Checkbox */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleToggle(p.id, !!checked)}
                  className="w-5 h-5 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
                />

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-500" />
                </div>

                {/* Tên */}
                <div className="text-sm font-bold text-slate-900 truncate">
                  {p.name}
                </div>
              </div>

              {/* Các ô nhập */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Ô Tỉ lệ */}
                <div className="w-[4rem] sm:w-[4.5rem] relative">
                  {isSelected && activeMode === "SHARES" ? (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={shares === 0 ? "" : shares}
                      onChange={(e) => handleSharesChange(p.id, e.target.value)}
                      className="w-full h-9 rounded-xl text-center font-bold text-[13px] sm:text-sm text-blue-700 bg-blue-50/50 border-blue-200 focus-visible:ring-blue-600 focus-visible:bg-white px-1 shadow-inner"
                      placeholder="0"
                    />
                  ) : (
                    <div className={`w-full h-9 rounded-xl flex items-center justify-center font-bold text-[13px] sm:text-sm px-1 ${isSelected ? 'text-slate-400 bg-slate-50 border border-slate-200/50' : 'text-slate-400'}`}>
                      {activeMode === "AMOUNT" ? "-" : (shares === 0 ? "-" : shares)}
                    </div>
                  )}
                </div>

                {/* Phân cách */}
                <div className="text-slate-300 font-medium text-xs sm:text-sm px-0.5">x</div>

                {/* Ô Số tiền */}
                <div className="w-[5.5rem] sm:w-[6.5rem] relative">
                  {isSelected && activeMode === "AMOUNT" ? (
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={amountVal === 0 ? "" : amountVal.toLocaleString()}
                      onChange={(e) => handleAmountChange(p.id, e.target.value)}
                      className="w-full h-9 rounded-xl text-right font-bold text-[13px] sm:text-sm text-blue-700 bg-blue-50/50 border-blue-200 focus-visible:ring-blue-600 focus-visible:bg-white px-2 shadow-inner"
                      placeholder="0"
                    />
                  ) : (
                    <div className={`w-full h-9 rounded-xl flex items-center justify-end font-bold text-[13px] sm:text-sm px-2 ${isSelected ? 'text-slate-400 bg-slate-50 border border-slate-200/50 truncate' : 'text-slate-400 truncate'}`}>
                      {amountVal === 0 ? "-" : formatCurrency(amountVal, { currency: displayCurrency })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
