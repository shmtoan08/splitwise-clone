"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

type Participant = {
  id: string;
  name: string;
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
};

export default function CustomAmountSplit({
  participants,
  splits,
  onChange,
  totalAmount,
  currency,
}: Props) {
  const t = useTranslations("expense");

  const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const left = totalAmount - currentTotal;
  const isExact = left === 0;

  const handleChange = (participantId: string, val: string) => {
    // Chỉ cho phép nhập số nguyên
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
    
    let newSplits = [...splits];
    const index = newSplits.findIndex(s => s.participantId === participantId);
    
    if (index >= 0) {
      newSplits[index].amount = num;
    } else {
      newSplits.push({ participantId, amount: num });
    }
    
    onChange(newSplits);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-slate-700">{t("splitBetween")}</span>
        <div className={`text-xs font-bold ${isExact ? 'text-blue-600 bg-blue-50 px-2 py-1 rounded-md' : 'text-destructive bg-destructive/10 px-2 py-1 rounded-md'}`}>
          {t("total")}: {formatCurrency(currentTotal, { currency })} 
          {!isExact && ` (${left > 0 ? '+' : ''}${formatCurrency(left, { currency })})`}
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
        {participants.map((p) => {
          const split = splits.find((s) => s.participantId === p.id);
          const val = split ? split.amount : 0;
          
          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 hover:bg-white rounded-xl transition-all border border-transparent active:scale-[0.98]"
            >
              <div className="text-sm font-medium text-slate-700 truncate flex-1 pr-4">
                {p.name}
              </div>
              <div className="w-32 relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={val === 0 ? "" : val.toLocaleString()}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                  className="pr-6 text-right rounded-lg bg-white h-10 border-slate-200 focus-visible:ring-blue-600 font-mono font-semibold text-sm"
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  {currency === "JPY" ? "¥" : "₫"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
