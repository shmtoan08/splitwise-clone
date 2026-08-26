"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { splitByShares } from "@/utils/algorithm";
import { useMemo, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { User } from "lucide-react";

type Participant = {
  id: string;
  name: string;
  weight?: number;
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

  useEffect(() => {
    if (splits.length === 0 && participants.length > 0) {
      const initialSplits = participants.map(p => ({
        participantId: p.id,
        shares: p.weight ?? 1
      }));
      onChange(initialSplits);
    }
  }, [splits.length, participants, onChange]);

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
    // Cho phép nhập số thập phân (float)
    const cleaned = val.replace(/[^0-9.]/g, "");
    // Tránh NaN nếu người dùng xóa hết
    const num = cleaned === "" ? 0 : parseFloat(cleaned);
    
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
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-slate-700">{t("splitBetween")}</span>
        <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          {t("total")}: {totalShares % 1 === 0 ? totalShares : totalShares.toFixed(2)} {t("sharesCount")}
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto scrollbar-hide min-h-[100px] px-1 pb-1 pt-1">
        {participants.map((p) => {
          const split = splits.find((s) => s.participantId === p.id);
          const shares = split ? split.shares : 0;
          const computed = computedSplits.find(s => s.participantId === p.id);
          
          return (
            <div
              key={p.id}
              className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 overflow-hidden flex-1 pr-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm sm:text-base font-bold text-slate-900 truncate">{p.name}</span>
                {shares > 0 && computed && (
                  <div>
                    <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                      {formatCurrency(computed.amount, { currency })}
                    </span>
                  </div>
                )}
              </div>
            </div>
              
              <div className="w-24 relative flex items-center">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={shares === 0 ? "" : shares}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                  className="w-20 sm:w-24 h-10 rounded-xl text-center font-bold text-blue-700 bg-blue-50/50 border-blue-200 focus-visible:ring-blue-600 focus-visible:bg-white transition-colors"
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
