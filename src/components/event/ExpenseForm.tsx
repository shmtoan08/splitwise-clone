"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addExpense, updateExpense, deleteExpense } from "@/actions/expense";
import SplitRows from "./split-modes/SplitRows";
import { AlertCircle } from "lucide-react";

type Participant = {
  id: string;
  name: string;
  weight?: number;
  deviceToken?: string | null;
};

type InitialExpense = {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  version: number;
  expenseDate?: Date;
  originalCurrency?: string | null;
  exchangeRate?: any;
  splitMode?: "AMOUNT" | "SHARES";
  splits: { participantId: string; amount: number; shares?: number | null }[];
};

type Group = {
  id: string;
  name: string;
  members: { participantId: string }[];
};

type Props = {
  eventId: string;
  participants: Participant[];
  initialExpense?: InitialExpense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  groups?: Group[];
  expensesCount?: number;
};

// Tiền tệ phổ biến được hỗ trợ (chọn originalCurrency)
const POPULAR_CURRENCIES = ["VND", "JPY", "USD", "EUR", "SGD", "THB", "KRW"];

type SplitMode = "AMOUNT" | "SHARES";

export default function ExpenseForm({ eventId, participants, initialExpense, open, onOpenChange, currency, groups = [], expensesCount }: Props) {
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tCurrency = useTranslations("currency");
  
  const isEdit = !!initialExpense;
  // Spec: default mode = SHARES cho khoản chi mới; edit = theo splitMode đã lưu
  const initialMode: SplitMode = initialExpense?.splitMode || "SHARES";
  
  const [title, setTitle] = useState(initialExpense?.title || t("expenseNumber", { number: (expensesCount || 0) + 1 }));
  const [amountStr, setAmountStr] = useState(initialExpense?.amount ? initialExpense.amount.toLocaleString('en-US') : "");
  const [payerId, setPayerId] = useState(initialExpense?.payerId || participants[0]?.id || "");
  const [expenseDateStr, setExpenseDateStr] = useState(
    initialExpense?.expenseDate 
      ? initialExpense.expenseDate.toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0]
  );
  // Set default payer to current user for new expenses
  useEffect(() => {
    if (!initialExpense) {
      const match = document.cookie.split("; ").find((row) => row.startsWith("split-app-device-token="));
      const deviceToken = match ? decodeURIComponent(match.split("=")[1]) : null;
      if (deviceToken) {
        const me = participants.find((p) => p.deviceToken === deviceToken);
        if (me) setPayerId(me.id);
      }
    }
  }, [initialExpense, participants]);

  const [activeMode, setActiveMode] = useState<SplitMode>(initialMode);
  
  // Multi-currency
  const [originalCurrency, setOriginalCurrency] = useState<string | undefined>(initialExpense?.originalCurrency || undefined);
  const [manualRateStr, setManualRateStr] = useState(initialExpense?.exchangeRate ? initialExpense.exchangeRate.toString() : "");
  const [needsManualRate, setNeedsManualRate] = useState(false);

  const [splits, setSplits] = useState<{ participantId: string; amount: number; shares?: number | null }[]>(
    initialExpense?.splits ?? []
  );

  const [isSplitValid, setIsSplitValid] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCurrency = originalCurrency || currency;
  const currencySymbol = useMemo(() => {
    try {
      return Intl.NumberFormat('en', { style: 'currency', currency: currentCurrency }).formatToParts(0).find(p => p.type === 'currency')?.value || currentCurrency;
    } catch {
      return currentCurrency;
    }
  }, [currentCurrency]);

  const getAmountFontSize = () => {
    const len = amountStr.length;
    if (len > 15) return "text-xl sm:text-2xl md:text-3xl";
    if (len > 11) return "text-2xl sm:text-3xl md:text-4xl";
    return "text-3xl sm:text-4xl md:text-5xl";
  };

  const amount = parseInt(amountStr.replace(/[^0-9]/g, ""), 10) || 0;

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(t("errorTitleRequired"));
      return;
    }
    if (amount <= 0) {
      setError(t("errorAmountRequired"));
      return;
    }

    setIsLoading(true);
    setError(null);

    let splitConfig: any = { mode: activeMode };
    // SplitRows đã trả về danh sách được lọc (checked) với đúng cấu trúc
    splitConfig.splits = splits;

    const manualRate = manualRateStr ? parseFloat(manualRateStr.replace(/,/g, ".")) : undefined;

    const payload: any = {
      eventId,
      title: title.trim(),
      amount,
      payerId,
      splitConfig,
      originalCurrency: originalCurrency || undefined,
      manualExchangeRate: manualRate,
      expenseDate: new Date(expenseDateStr),
    };

    let res;
    if (isEdit && initialExpense) {
      payload.id = initialExpense.id;
      payload.currentVersion = initialExpense.version;
      res = await updateExpense(payload);
    } else {
      res = await addExpense(payload);
    }

    if (!res.success) {
      if (res.error === "VERSION_CONFLICT") {
        setError(tErrors("versionConflict"));
      } else if (res.error === "NOT_FOUND") {
        setError(tErrors("expenseNotFound"));
      } else if (res.error?.startsWith("EXCHANGE_RATE_UNAVAILABLE:")) {
        // API tỷ giá lỗi → yêu cầu nhập tay
        setNeedsManualRate(true);
        setError(tCurrency("apiUnavailable"));
      } else {
        setError(res.error);
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
      onOpenChange(false);
      if (!isEdit) {
        setTitle("");
        setAmountStr("");
        setActiveMode("SHARES");
        setSplits([]);
        setOriginalCurrency(undefined);
        setManualRateStr("");
        setNeedsManualRate(false);
        setExpenseDateStr(new Date().toISOString().split("T")[0]);
      }
    }
  };

  const handleDelete = async () => {
    if (!initialExpense) return;
    if (confirm(t("deleteConfirmMessage"))) {
      setIsLoading(true);
      setError(null);
      const res = await deleteExpense(initialExpense.id, eventId);
      if (!res.success) {
        if (res.error === "NOT_FOUND") {
          setError(tErrors("expenseNotFound"));
        } else {
          setError(res.error);
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
        onOpenChange(false);
      }
    }
  };

  const handleAmountChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
    setAmountStr(num === 0 ? "" : num.toLocaleString('en-US'));
  };

  const content = (
    <div className="px-4 sm:px-6 py-0 flex flex-col gap-5 flex-1 min-h-0">
      {error && <p className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-xl text-center">{error}</p>}
      
      {/* Removed unsupportedSplitMode banner */}

      <div className="flex flex-col items-center py-2 relative">
        <div className="relative flex items-center justify-center w-full">
          <Input 
            type="text" 
            inputMode="numeric" 
            placeholder={t("amountPlaceholder")} 
            value={amountStr} 
            onChange={(e) => handleAmountChange(e.target.value)} 
            className={`w-full text-center font-black h-24 bg-transparent border-none shadow-none focus-visible:ring-0 text-blue-600 pl-6 pr-32 sm:pl-10 sm:pr-36 placeholder:text-slate-300 placeholder:font-semibold transition-all duration-200 ${getAmountFontSize()}`}
            disabled={isLoading}
          />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Select
                value={originalCurrency ?? currency}
                onValueChange={(val) => {
                  if (val === currency) {
                    setOriginalCurrency(undefined);
                  } else {
                    setOriginalCurrency(val || undefined);
                  }
                  setNeedsManualRate(false);
                  setManualRateStr("");
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="border-none shadow-none text-2xl font-black text-blue-400 opacity-70 bg-transparent hover:bg-slate-100/50 p-1 px-2 focus:ring-0 w-auto focus:bg-slate-100/50 outline-none">
                  <SelectValue placeholder={currency} />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
        </div>
        
        {isEdit && initialExpense?.originalCurrency && initialExpense.originalCurrency !== currency && initialExpense.exchangeRate && (
          <div className="mt-2 text-[11px] font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            Tỷ giá đã lưu: 1 {initialExpense.originalCurrency} = {initialExpense.exchangeRate} {currency}
          </div>
        )}

        {/* Fallback: nhập tỷ giá tay khi API không khả dụng */}
        {needsManualRate && originalCurrency && originalCurrency !== currency && (
          <div className="flex items-start gap-2 mt-3 p-3 w-full bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-xs text-amber-700 font-medium">{tCurrency("apiUnavailable")}</p>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={tCurrency("manualRatePlaceholder")}
                value={manualRateStr}
                onChange={(e) => setManualRateStr(e.target.value)}
                disabled={isLoading}
                className="h-9 rounded-lg text-sm bg-white border-amber-200 focus-visible:ring-amber-400"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-row gap-3">
        <div className="w-[145px] shrink-0">
          <Input 
            type="date"
            placeholder={t("expenseDate")}
            value={expenseDateStr} 
            onChange={(e) => setExpenseDateStr(e.target.value)} 
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-600 focus-visible:bg-white text-slate-700"
          />
        </div>

        <div className="flex-1">
          <Select value={payerId} onValueChange={(val) => setPayerId(val || "")} disabled={isLoading}>
            <SelectTrigger className="w-full !h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-blue-600 font-medium">
                <SelectValue placeholder={t("paidBy")}>
                  <span className="text-slate-400 mr-1">{t("paidBy")}</span> 
                  {participants.find(p => p.id === payerId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {participants.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>

      {/* ── Removed Tiền tệ gốc block from here ── */}

      <div className="pt-2 pb-0 flex flex-col flex-1 min-h-0">
        <SplitRows 
          participants={participants}
          initialSplits={initialExpense?.splits}
          initialMode={initialMode}
          totalAmount={amount}
          currency={currency}
          originalCurrency={originalCurrency}
          groups={groups}
          onChange={(mode, newSplits) => {
            setActiveMode(mode);
            setSplits(newSplits);
          }}
          onValidityChange={setIsSplitValid}
        />
      </div>
    </div>
  );

  const stickyFooter = (
    <div className="flex flex-row gap-2 sm:gap-3 px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-2 border-t border-slate-100 bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] sm:rounded-b-3xl">
      <Button onClick={() => onOpenChange(false)} variant="secondary" className="flex-1 h-12 rounded-full font-medium active:scale-95 transition-all shadow-sm text-base bg-slate-100 hover:bg-slate-200 text-slate-700 border-none">
        {tCommon("close") || "Đóng"}
      </Button>
      {/* BUG3 FIX: disabled theo tab đang active */}
      <Button onClick={handleSubmit} disabled={isLoading || !isSplitValid} className={`${isEdit ? 'flex-[1.5]' : 'flex-1'} h-12 rounded-full font-medium active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-base`}>
        {isLoading ? tCommon("loading") : (isEdit ? t("update") : t("save"))}
      </Button>
      {isEdit && (
        <Button onClick={handleDelete} disabled={isLoading} variant="destructive" className="flex-1 h-12 rounded-full font-medium active:scale-95 transition-all shadow-sm text-base bg-red-50 hover:bg-red-100 text-red-600 border-none">
          {t("delete")}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] w-[95vw] rounded-3xl p-0 overflow-hidden flex flex-col gap-0 max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="text-2xl font-normal text-slate-900 text-center">
            <input 
              type="text" 
              placeholder={t("titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              className="w-full text-center bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-300 font-normal p-0"
            />
          </DialogTitle>
        </DialogHeader>
        {content}
        {stickyFooter}
      </DialogContent>
    </Dialog>
  );
}
