"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { splitEvenly } from "@/utils/algorithm";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";

type Participant = {
  id: string;
  name: string;
};

type Props = {
  participants: Participant[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  totalAmount: number;
  currency: string;
};

export default function EvenSplit({
  participants,
  selectedIds,
  onChange,
  totalAmount,
  currency,
}: Props) {
  const t = useTranslations("expense");

  // Xử lý thuật toán ngay trên Client để hiển thị preview số tiền
  const computedSplits = useMemo(() => {
    if (selectedIds.length === 0 || totalAmount <= 0) return [];
    try {
      return splitEvenly(totalAmount, selectedIds);
    } catch {
      return [];
    }
  }, [totalAmount, selectedIds]);

  const toggleAll = () => {
    if (selectedIds.length === participants.length) {
      onChange([]);
    } else {
      onChange(participants.map((p) => p.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const isAllSelected = selectedIds.length === participants.length && participants.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-slate-700">{t("splitBetween")}</span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all active:scale-95"
        >
          {isAllSelected ? t("unselectAll") : t("selectAll")}
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
        {participants.map((p) => {
          const isSelected = selectedIds.includes(p.id);
          const computed = computedSplits.find((s) => s.participantId === p.id);
          
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer active:scale-[0.98] ${
                isSelected ? "bg-white shadow-sm border border-slate-200" : "hover:bg-white border border-transparent"
              }`}
              onClick={() => toggleOne(p.id)}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleOne(p.id)}
                  id={`even-split-${p.id}`}
                  className="rounded-full data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-slate-300 w-5 h-5"
                />
                <label
                  htmlFor={`even-split-${p.id}`}
                  className={`text-sm font-medium leading-none cursor-pointer ${isSelected ? "text-slate-900" : "text-slate-600"}`}
                  onClick={(e) => e.preventDefault()} // Ngăn double toggle
                >
                  {p.name}
                </label>
              </div>
              
              {isSelected && computed && (
                <span className="text-sm font-bold text-slate-900 font-mono bg-slate-100 px-3 py-1 rounded-full tracking-tight">
                  {formatCurrency(computed.amount, { currency })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
