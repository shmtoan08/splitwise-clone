"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { splitByShares } from "@/utils/algorithm";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";

type Participant = {
  id: string;
  name: string;
};

type ShareSplit = {
  participantId: string;
  shares: number;
};

type Props = {
  participants: Participant[];
  splits: ShareSplit[];
  onChange: (splits: ShareSplit[]) => void;
  totalAmount: number;
  currency: string;
};

export default function SharesSplit({
  participants,
  splits,
  onChange,
  totalAmount,
  currency,
}: Props) {
  const t = useTranslations("expense");

  // Xử lý thuật toán chia tỷ lệ ngay trên Client để hiển thị preview
  const computedSplits = useMemo(() => {
    const validSplits = splits.filter(s => s.shares > 0);
    if (validSplits.length === 0 || totalAmount <= 0) return [];
    try {
      return splitByShares(totalAmount, validSplits);
    } catch {
      return [];
    }
  }, [totalAmount, splits]);

  const handleChange = (participantId: string, val: string) => {
    // Chỉ cho phép nhập số nguyên
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
    
    let newSplits = [...splits];
    const index = newSplits.findIndex(s => s.participantId === participantId);
    
    if (index >= 0) {
      newSplits[index].shares = num;
    } else {
      newSplits.push({ participantId, shares: num });
    }
    
    onChange(newSplits);
  };

  const totalShares = splits.reduce((sum, s) => sum + s.shares, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-slate-700">{t("splitBetween")}</span>
        <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          {t("total")}: {totalShares} {t("sharesCount")}
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
        {participants.map((p) => {
          const split = splits.find((s) => s.participantId === p.id);
          const shares = split ? split.shares : 0;
          const computed = computedSplits.find(s => s.participantId === p.id);
          
          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 hover:bg-white rounded-xl transition-all border border-transparent active:scale-[0.98]"
            >
              <div className="flex flex-col flex-1 pr-2 min-w-0">
                <span className="text-sm font-medium text-slate-700 truncate">{p.name}</span>
                {shares > 0 && computed && (
                  <div>
                    <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                      {formatCurrency(computed.amount, { currency })}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="w-24 relative flex items-center">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={shares === 0 ? "" : shares}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                  className="text-center rounded-lg bg-white h-10 border-slate-200 focus-visible:ring-blue-600 font-semibold"
                  placeholder="0"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
