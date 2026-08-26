"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { User, Calculator } from "lucide-react";
import { splitEvenly } from "@/utils/algorithm";
import { useEffect, useState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

type Participant = {
  id: string;
  name: string;
};

type Group = {
  id: string;
  name: string;
  members: { participantId: string }[];
};

type CustomSplitAmount = {
  participantId: string;
  amount: number;
};

type Props = {
  participants: Participant[];
  splits: CustomSplitAmount[];
  onChange: (splits: CustomSplitAmount[]) => void;
  totalAmount: number;
  currency: string;
  originalCurrency?: string;
  groups?: Group[];
  onValidityChange: (isValid: boolean) => void;
};

export default function CustomAmountSplit({
  participants,
  splits,
  onChange,
  totalAmount,
  currency,
  originalCurrency,
  groups = [],
  onValidityChange,
}: Props) {
  const t = useTranslations("expense");
  const displayCurrency = originalCurrency ?? currency;

  const [selectedIds, setSelectedIds] = useState<string[]>(
    splits.length > 0 ? splits.filter(s => s.amount > 0).map(s => s.participantId) : participants.map(p => p.id)
  );

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current && splits.length === 0 && totalAmount > 0 && participants.length > 0) {
      isInitialMount.current = false;
      try {
        const evenSplits = splitEvenly(totalAmount, participants.map(p => p.id));
        onChange(evenSplits);
      } catch (e) {
        // ignore
      }
    }
  }, [totalAmount, participants, splits, onChange]);

  const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const left = totalAmount - currentTotal;
  const isExact = totalAmount <= 0 || left === 0;

  useEffect(() => {
    onValidityChange(isExact);
  }, [isExact, onValidityChange]);

  const handleAmountChange = (participantId: string, val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
    
    let newSplits = [...splits];
    const index = newSplits.findIndex(s => s.participantId === participantId);
    
    if (index >= 0) {
      newSplits[index].amount = num;
    } else {
      newSplits.push({ participantId, amount: num });
    }
    
    if (num > 0 && !selectedIds.includes(participantId)) {
      setSelectedIds(prev => [...prev, participantId]);
    } else if (num === 0 && selectedIds.includes(participantId)) {
      // Don't auto-uncheck, let them uncheck manually
    }
    
    onChange(newSplits);
  };

  const handleRecalculateEvenly = (idsToSplit: string[]) => {
    if (idsToSplit.length === 0 || totalAmount <= 0) {
      const newSplits = participants.map(p => ({ participantId: p.id, amount: 0 }));
      onChange(newSplits);
      return;
    }

    try {
      const evenSplits = splitEvenly(totalAmount, idsToSplit);
      const newSplits = participants.map(p => {
        const evenMatch = evenSplits.find(e => e.participantId === p.id);
        return {
          participantId: p.id,
          amount: evenMatch ? evenMatch.amount : 0
        };
      });
      onChange(newSplits);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleParticipant = (participantId: string, checked: boolean) => {
    let newSelectedIds = [];
    if (checked) {
      newSelectedIds = [...selectedIds, participantId];
    } else {
      newSelectedIds = selectedIds.filter(id => id !== participantId);
    }
    setSelectedIds(newSelectedIds);
    handleRecalculateEvenly(newSelectedIds);
  };

  const handleToggleAll = (selectAll: boolean) => {
    const newSelectedIds = selectAll ? participants.map(p => p.id) : [];
    setSelectedIds(newSelectedIds);
    handleRecalculateEvenly(newSelectedIds);
  };

  const handleGroupClick = (group: Group) => {
    const groupMemberIds = group.members.map(m => m.participantId);
    const validIds = groupMemberIds.filter(id => participants.some(p => p.id === id));
    setSelectedIds(validIds);
    handleRecalculateEvenly(validIds);
  };

  const allSelected = selectedIds.length === participants.length;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
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

      <div className="flex items-center justify-between px-1">
        <button 
          onClick={() => handleToggleAll(!allSelected)}
          className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          {allSelected ? t("unselectAll") || "Bỏ chọn tất cả" : t("selectAll") || "Chọn tất cả"}
        </button>
        <div className="flex items-center gap-2">
          <div className={`text-xs font-bold ${isExact ? 'text-blue-600 bg-blue-50 px-2 py-1 rounded-md' : 'text-destructive bg-destructive/10 px-2 py-1 rounded-md'}`}>
            {t("total")}: {formatCurrency(currentTotal, { currency: displayCurrency })} 
            {!isExact && totalAmount > 0 && ` (${left > 0 ? '+' : ''}${formatCurrency(left, { currency: displayCurrency })})`}
          </div>
          <button 
            onClick={() => handleRecalculateEvenly(selectedIds)}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
            title="Chia đều lại"
          >
            <Calculator className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto scrollbar-hide min-h-[100px] px-1 pb-1 pt-1">
        {participants.map((p) => {
          const split = splits.find((s) => s.participantId === p.id);
          const val = split ? split.amount : 0;
          const isSelected = selectedIds.includes(p.id);
          
          return (
            <div
              key={p.id}
              className={`bg-white p-3 sm:p-4 rounded-2xl border ${isSelected ? 'border-blue-300 ring-1 ring-blue-500/10 shadow-sm' : 'border-slate-200/80 shadow-sm opacity-60'} transition-all flex items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={(checked) => handleToggleParticipant(p.id, checked as boolean)}
                  className="w-5 h-5 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {p.name}
                </div>
              </div>
              <div className="w-32 relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={val === 0 && !isSelected ? "" : val.toLocaleString()}
                  onChange={(e) => handleAmountChange(p.id, e.target.value)}
                  disabled={!isSelected}
                  className={`pr-6 text-right rounded-lg h-10 border-slate-200 focus-visible:ring-blue-600 font-mono font-semibold text-sm ${isSelected ? 'bg-white' : 'bg-slate-50 text-slate-400'}`}
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  {displayCurrency === "JPY" ? "¥" : "₫"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
