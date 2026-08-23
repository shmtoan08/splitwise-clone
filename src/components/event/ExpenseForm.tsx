"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addExpense, updateExpense, deleteExpense } from "@/actions/expense";
import EvenSplit from "./split-modes/EvenSplit";
import CustomAmountSplit from "./split-modes/CustomAmountSplit";
import SharesSplit from "./split-modes/SharesSplit";

import { splitEvenly } from "@/utils/algorithm";

type Participant = {
  id: string;
  name: string;
};

type InitialExpense = {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  version: number;
  splits: { participantId: string; amount: number }[];
};

type Props = {
  eventId: string;
  participants: Participant[];
  initialExpense?: InitialExpense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
};

type SplitMode = "EVEN" | "CUSTOM" | "SHARES";

function isEvenSplit(amount: number, splits: { participantId: string; amount: number }[]) {
  if (splits.length === 0 || amount <= 0) return false;
  try {
    const participantIds = splits.map(s => s.participantId);
    const evenSplits = splitEvenly(amount, participantIds);
    return evenSplits.every(es => {
      const actual = splits.find(s => s.participantId === es.participantId);
      return actual && actual.amount === es.amount;
    });
  } catch {
    return false;
  }
}

export default function ExpenseForm({ eventId, participants, initialExpense, open, onOpenChange, currency }: Props) {
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  
  const isEdit = !!initialExpense;
  const initialIsEven = initialExpense ? isEvenSplit(initialExpense.amount, initialExpense.splits) : false;
  const initialMode = initialExpense ? (initialIsEven ? "EVEN" : "CUSTOM") : "EVEN";
  
  const [title, setTitle] = useState(initialExpense?.title || "");
  const [amountStr, setAmountStr] = useState(initialExpense?.amount ? initialExpense.amount.toString() : "");
  const [payerId, setPayerId] = useState(initialExpense?.payerId || participants[0]?.id || "");
  const [splitMode, setSplitMode] = useState<SplitMode>(initialMode);
  
  const [evenSelectedIds, setEvenSelectedIds] = useState<string[]>(
    initialIsEven && initialExpense ? initialExpense.splits.map(s => s.participantId) : participants.map(p => p.id)
  );
  const [customSplits, setCustomSplits] = useState<{ participantId: string; amount: number }[]>(
    !initialIsEven && initialExpense ? initialExpense.splits : []
  );
  const [sharesSplits, setSharesSplits] = useState<{ participantId: string; shares: number }[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    let splitConfig: any = { mode: splitMode };
    if (splitMode === "EVEN") {
      splitConfig.participantIds = evenSelectedIds;
    } else if (splitMode === "CUSTOM") {
      splitConfig.splits = customSplits;
    } else if (splitMode === "SHARES") {
      splitConfig.splits = sharesSplits;
    }

    const payload: any = {
      eventId,
      title: title.trim(),
      amount,
      payerId,
      splitConfig,
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
        setSplitMode("EVEN");
        setEvenSelectedIds(participants.map(p => p.id));
        setCustomSplits([]);
        setSharesSplits([]);
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
    setAmountStr(num === 0 ? "" : num.toLocaleString());
  };

  const content = (
    <div className="px-4 sm:px-6 pb-2 space-y-5 overflow-y-auto scrollbar-hide flex-1">
      {error && <p className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-xl text-center">{error}</p>}
      
      {isEdit && !initialIsEven && splitMode === "CUSTOM" && (
        <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 text-center font-medium">
          {t("unsupportedSplitMode")}
        </div>
      )}

      {/* ── Giant Amount Input ── */}
      <div className="flex flex-col items-center py-4">
        <label className="text-sm font-semibold text-slate-500 mb-2">{t("amount")}</label>
        <div className="relative flex items-center justify-center">
          <Input 
            type="text" 
            inputMode="numeric" 
            placeholder="0" 
            value={amountStr} 
            onChange={(e) => handleAmountChange(e.target.value)} 
            className="w-full text-center text-4xl sm:text-5xl font-extrabold h-20 bg-transparent border-none shadow-none focus-visible:ring-0 text-slate-900 px-8"
            disabled={isLoading}
          />
          {amountStr && <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">{currency === "JPY" ? "¥" : "₫"}</span>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">{t("title")}</label>
        <Input 
          placeholder={t("titlePlaceholder")} 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          disabled={isLoading}
          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-600 focus-visible:bg-white"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700">{t("paidBy")}</label>
        <Select value={payerId} onValueChange={(val) => setPayerId(val || "")} disabled={isLoading}>
          <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-blue-600 font-medium">
              <SelectValue>
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
      <div className="pt-2 pb-6">
        <Tabs value={splitMode} onValueChange={(v) => setSplitMode(v as SplitMode)} className="w-full">
          <TabsList className="flex w-full bg-slate-100 p-1 rounded-full h-12">
            <TabsTrigger value="EVEN" className="flex-1 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:font-bold data-[state=active]:text-slate-900 text-slate-500 font-medium transition-all active:scale-95">{t("splitEvenly")}</TabsTrigger>
            <TabsTrigger value="CUSTOM" className="flex-1 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:font-bold data-[state=active]:text-slate-900 text-slate-500 font-medium transition-all active:scale-95">{t("splitCustom")}</TabsTrigger>
            <TabsTrigger value="SHARES" className="flex-1 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:font-bold data-[state=active]:text-slate-900 text-slate-500 font-medium transition-all active:scale-95">{t("splitShares")}</TabsTrigger>
          </TabsList>
          <div className="mt-4">
            <TabsContent value="EVEN" className="m-0">
              <EvenSplit 
                participants={participants} 
                selectedIds={evenSelectedIds} 
                onChange={setEvenSelectedIds} 
                totalAmount={amount}
                currency={currency}
              />
            </TabsContent>
            <TabsContent value="CUSTOM" className="m-0">
              <CustomAmountSplit 
                participants={participants} 
                splits={customSplits} 
                onChange={setCustomSplits} 
                totalAmount={amount}
                currency={currency}
              />
            </TabsContent>
            <TabsContent value="SHARES" className="m-0">
              <SharesSplit 
                participants={participants} 
                splits={sharesSplits} 
                onChange={setSharesSplits} 
                totalAmount={amount}
                currency={currency}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );

  const stickyFooter = (
    <div className="flex flex-col gap-3 p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] sm:rounded-b-3xl">
      <Button onClick={handleSubmit} disabled={isLoading} className="w-full h-12 rounded-full font-medium active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-base">
        {isLoading ? tCommon("loading") : (isEdit ? t("update") : t("save"))}
      </Button>
      {isEdit && (
        <Button onClick={handleDelete} disabled={isLoading} variant="destructive" className="w-full h-12 rounded-full font-medium active:scale-95 transition-all shadow-sm text-base bg-red-50 hover:bg-red-100 text-red-600 border-none">
          {t("delete")}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] w-[95vw] rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-2xl font-normal text-slate-900 text-center">
            {isEdit ? t("editExpense") : t("addExpense")}
          </DialogTitle>
        </DialogHeader>
        {content}
        {stickyFooter}
      </DialogContent>
    </Dialog>
  );
}
