"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { formatCurrency, getOptimizedImageUrl } from "@/lib/utils";
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
import { addExpense, updateExpense, deleteExpense, deleteReceiptFromCloudinary } from "@/actions/expense";
import SplitRows from "./split-modes/SplitRows";
import { AlertCircle, Camera, Loader2, Trash2 } from "lucide-react";

type Participant = {
  id: string;
  name: string;
  weight?: number;
  deviceToken?: string | null;
};

type InitialExpense = {
  id?: string;
  title: string;
  amount: number;
  payerId: string;
  version: number;
  expenseDate?: Date;
  originalCurrency?: string | null;
  exchangeRate?: any;
  splitMode?: "AMOUNT" | "SHARES";
  receiptUrl?: string | null;
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

const POPULAR_CURRENCIES = ["VND", "JPY", "USD", "EUR", "SGD", "THB", "KRW"];

type SplitMode = "AMOUNT" | "SHARES";

export default function ExpenseForm({ eventId, participants, initialExpense, open, onOpenChange, currency, groups = [], expensesCount }: Props) {
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tCurrency = useTranslations("currency");
  
  const isEdit = !!initialExpense?.id;
  const initialMode: SplitMode = initialExpense?.splitMode || "SHARES";

    // Tách riêng tiêu đề mặc định ra một biến để dễ so sánh
  const defaultTitle = t("expenseNumber", { number: (expensesCount || 0) + 1 });

  const [title, setTitle] = useState(initialExpense?.title || defaultTitle);

  // Dùng useRef để ghi nhớ giá trị tiêu đề ngay trước khi người dùng chạm vào (Focus)
  const prevTitleRef = useRef<string>(title);

  //const [title, setTitle] = useState(initialExpense?.title || t("expenseNumber", { number: (expensesCount || 0) + 1 }));
  const [amountStr, setAmountStr] = useState(initialExpense?.amount ? (initialExpense.originalCurrency ? (initialExpense.amount / (initialExpense.exchangeRate?.toNumber() || 1)).toLocaleString('en-US') : initialExpense.amount.toLocaleString('en-US')) : "");
  
  const [receiptUrl, setReceiptUrl] = useState<string | null>(initialExpense?.receiptUrl || null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const receiptUrlToReplaceRef = useRef<string | null>(initialExpense?.receiptUrl || null);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);


  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh không được vượt quá 5MB");
      return;
    }
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      setError("Cloudinary chưa được cấu hình (.env)");
      return;
    }
    setIsUploadingReceipt(true);
    setError(null);
    try {
      if (receiptUrlToReplaceRef.current) {
        const delRes = await deleteReceiptFromCloudinary(receiptUrlToReplaceRef.current);
        if (!delRes.success) {
          console.warn("Could not delete old receipt:", delRes.error);
        }
        // Sau khi xóa xong, xóa tham chiếu để tránh xóa nhầm lần sau
        receiptUrlToReplaceRef.current = null;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", `split_app/events/${eventId}`);
      
      if (isEdit && initialExpense?.id) {
        formData.append("public_id", `expense_${initialExpense.id}`);
      } else {
        formData.append("public_id", `expense_tmp_${Date.now()}`);
      }
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        // Bypass cache by appending a timestamp query string
        const freshUrl = `${data.secure_url}?t=${Date.now()}`;
        setReceiptUrl(freshUrl);
        receiptUrlToReplaceRef.current = data.secure_url;
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(`Lỗi tải ảnh: ${err.message || "Vui lòng thử lại."}`);
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = "";
    }
  };

  const [payerId, setPayerId] = useState(initialExpense?.payerId || participants[0]?.id || "");
  const [expenseDateStr, setExpenseDateStr] = useState(
    initialExpense?.expenseDate 
      ? initialExpense.expenseDate.toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0]
  );

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

    let splitConfig: any = { mode: activeMode, splits };
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
      receiptUrl,
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
        setTitle(t("expenseNumber", { number: (expensesCount || 0) + 2 }));
        setAmountStr("");
        setActiveMode("SHARES");
        setSplits([]);
        setOriginalCurrency(undefined);
        setManualRateStr("");
        setNeedsManualRate(false);
        setExpenseDateStr(new Date().toISOString().split("T")[0]);
        setReceiptUrl(null);
      }
    }
  };

  const handleDelete = async () => {
    if (!initialExpense?.id) return;
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
    <div className="px-4 sm:px-6 py-0 flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto">
      {error && <p className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-xl text-center">{error}</p>}

      <div className="flex flex-col items-center py-2 relative">
        <div className="relative flex items-center justify-center w-full">
          <Input 
            type="text" 
            inputMode="numeric" 
            placeholder={t("amountPlaceholder")} 
            value={amountStr} 
            onChange={(e) => handleAmountChange(e.target.value)} 
            className={`w-full text-center font-black h-20 sm:h-24 bg-transparent border-none shadow-none focus-visible:ring-0 text-blue-600 pl-4 pr-20 sm:pl-10 sm:pr-36 placeholder:text-slate-300 placeholder:font-semibold transition-all duration-200 ${getAmountFontSize()}`}
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

      {/* Cụm Ngày tháng, Người trả & Hóa đơn (2 dòng) */}
      <div className="flex flex-col gap-3">
        {/* Dòng 1: Người trả (Trọn 100% bề ngang) */}
        <div className="w-full">
          <Select value={payerId} onValueChange={(val) => setPayerId(val || "")} disabled={isLoading}>
            <SelectTrigger className="w-full !h-11 rounded-xl bg-slate-50 border-slate-200 focus:ring-blue-600 font-medium text-xs sm:text-sm px-3 flex items-center justify-between">
              <SelectValue placeholder={t("paidBy")}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-400 shrink-0">{t("paidBy")}</span>
                  <span className="truncate text-slate-800 font-semibold">
                    {participants.find((p) => p.id === payerId)?.name}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {participants.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

{/* Dòng 2: Ngày phát sinh (Trái - Khung ôm khít) + Nút Upload/Thumbnail Hóa đơn (Phải) */}
        <div className="flex items-center justify-between w-full gap-3 mt-1">
          
          {/* TRÁI: Ô Chọn ngày (Khung xám ôm khít 135px vừa đẹp YYYY/MM/DD + Icon) */}
          <div className="w-[135px] sm:w-[145px] shrink-0">
            <Input
              type="date"
              value={expenseDateStr}
              onChange={(e) => setExpenseDateStr(e.target.value)}
              disabled={isLoading}
              className="h-11 py-0 w-full rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-600 text-slate-700 text-xs sm:text-sm px-3 flex items-center appearance-none [&::-webkit-date-and-time-value]:min-h-0 [&::-webkit-date-and-time-value]:m-0 [&::-webkit-date-and-time-value]:leading-none"
            />
          </div>

          {/* Input file ẩn dùng chung */}
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadReceipt}
            disabled={isLoading || isUploadingReceipt}
          />

          {/* Nút Upload / Preview Thumbnail Hóa đơn */}
          <div className="shrink-0 flex items-center justify-end">
            {receiptUrl ? (
              <div className="flex items-center gap-2">
                {/* 1. Icon Camera + Text nằm BÊN TRÁI */}
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  disabled={isLoading || isUploadingReceipt}
                  className="h-11 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition-all active:scale-95 shrink-0 shadow-sm"
                  title={t("changeReceipt", { fallback: "Đổi ảnh khác" })}
                >
                  {isUploadingReceipt ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Camera className="w-4 h-4 shrink-0" />
                  )}
                  {/* Hiển thị chữ 'Đổi ảnh' trên PC và 'Đổi' trên Mobile */}
                  <span className="hidden sm:inline">Đổi ảnh</span>
                  <span className="inline sm:hidden">Đổi</span>
                </button>

                {/* 2. Thumbnail Preview Ảnh nằm BÊN PHẢI */}
                <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-blue-200 bg-slate-100 shrink-0 shadow-sm">
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={isLoading || isUploadingReceipt}
                    className="w-full h-full block disabled:opacity-60"
                    title={t("changeReceipt", { fallback: "Đổi ảnh khác" })}
                  >
                    <img src={getOptimizedImageUrl(receiptUrl)} alt="Receipt" className="w-full h-full object-cover" />
                    {isUploadingReceipt && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptUrl(null)}
                    disabled={isLoading || isUploadingReceipt}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-colors"
                    title={t("removeReceipt", { fallback: "Xóa ảnh" })}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Trạng thái chưa chọn ảnh */
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                disabled={isLoading || isUploadingReceipt}
                className="h-11 px-3 sm:px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-sm"
              >
                {isUploadingReceipt ? (
                  <Loader2 className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                )}
                <span className="hidden sm:inline">{t("attachReceipt", { fallback: "Đính kèm" })}</span>
                <span className="inline sm:hidden">{t("attachReceipt", { fallback: "Thêm ảnh" })}</span>
              </button>
            )}
          </div>

        </div>

      </div>

      <div className="pt-2 pb-0">
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
      <Button onClick={handleSubmit} disabled={isLoading || !isSplitValid || isUploadingReceipt} className={`${isEdit ? 'flex-[1.5]' : 'flex-1'} h-12 rounded-full font-medium active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-base`}>
        {isLoading || isUploadingReceipt ? tCommon("loading") : (isEdit ? t("update") : t("save"))}
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
      <DialogContent className="sm:max-w-[550px] w-[calc(100vw-32px)] sm:w-[95vw] rounded-3xl p-0 overflow-hidden flex flex-col gap-0 max-h-[calc(100dvh-32px)] sm:max-h-[90vh]">
<DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="flex justify-center w-full">
            <textarea
              rows={title.length > 20 ? 2 : 1}
              maxLength={60} 
              placeholder={t("titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              // 1. KHI CHẠM VÀO (FOCUS)
              onFocus={() => {
                prevTitleRef.current = title; // Lưu lại giá trị hiện tại
                // Chỉ tự động xóa nếu đang tạo mới VÀ đang hiển thị đúng tiêu đề mặc định
                if (!isEdit && title === defaultTitle) {
                  setTitle("");
                }
              }}
              // 2. KHI BỎ CHẠM (BLUR)
              onBlur={() => {
                // Nếu người dùng xóa trắng rồi click ra ngoài, khôi phục lại giá trị lúc nãy
                if (title.trim() === "") {
                  setTitle(prevTitleRef.current || defaultTitle);
                }
              }}
              disabled={isLoading}
              className={`w-full text-center bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-300 font-bold p-0 resize-none overflow-hidden leading-tight transition-all duration-300 ${
                title.length > 40 ? "text-lg sm:text-xl" :
                title.length > 20 ? "text-xl sm:text-2xl" :
                "text-2xl sm:text-3xl"
              }`}
            />
          </DialogTitle>
        </DialogHeader>
        {content}
        {stickyFooter}
      </DialogContent>
    </Dialog>
  );
}