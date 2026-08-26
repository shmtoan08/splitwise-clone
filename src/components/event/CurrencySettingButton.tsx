"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEventCurrency } from "@/actions/event";
import { Globe, Check, Loader2 } from "lucide-react";

// Danh sách tiền tệ được hỗ trợ
const SUPPORTED_CURRENCIES = [
  { code: "VND", label: "Việt Nam Đồng (VND)" },
  { code: "JPY", label: "Nhật Bản Yên (JPY)" },
  { code: "USD", label: "Đô la Mỹ (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "SGD", label: "Đô la Singapore (SGD)" },
  { code: "THB", label: "Bath Thái (THB)" },
  { code: "KRW", label: "Won Hàn Quốc (KRW)" },
];

type Props = {
  eventId: string;
  currentCurrency: string;
  isCreator: boolean;
};

export default function CurrencySettingButton({ eventId, currentCurrency, isCreator }: Props) {
  const t = useTranslations("currency");
  const tCommon = useTranslations("common"); // Thêm translation chung nếu có

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentCurrency);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  if (!isCreator) return null;

  const handleSave = async () => {
    if (selected === currentCurrency) {
      setOpen(false);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const res = await updateEventCurrency({ eventId, baseCurrency: selected });

    setIsLoading(false);

    if (!res.success) {
      if (res.error === "unauthorized") {
        setMessage({ type: "warning", text: t("warningUnauthorized") });
      } else if (res.error === "CANNOT_CHANGE_CURRENCY_WITH_EXPENSES") {
        setMessage({ type: "warning", text: t("warningHasExpenses") });
      } else {
        setMessage({ type: "error", text: t("errorSystem") });
      }
      return;
    }

    setMessage({ type: "success", text: t("successMessage") });
    setTimeout(() => setOpen(false), 1200);
  };

  // Reset state khi mở lại dialog
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setSelected(currentCurrency);
      setMessage(null);
    }
  };

  return (
    <>
      {/* Trigger Button: Dáng viên thuốc (Pill) tinh tế, có hiệu ứng nảy nhẹ */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 rounded-full text-xs font-bold border-slate-200 text-slate-700 bg-white/80 shadow-sm hover:bg-slate-100 active:scale-95 transition-all gap-1.5 px-3"
      >
        <Globe className="w-3.5 h-3.5 text-slate-500" />
        {currentCurrency}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-3xl p-0 overflow-hidden bg-slate-50 flex flex-col max-h-[85vh]">
          
          {/* Header cố định */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 text-center">
                {t("title")}
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Vùng cuộn danh sách tiền tệ */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-2.5">
            {SUPPORTED_CURRENCIES.map((c) => {
              const isSelected = selected === c.code;
              const isCurrent = currentCurrency === c.code;
              
              return (
                <div
                  key={c.code}
                  onClick={() => !isLoading && setSelected(c.code)}
                  className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                    isSelected
                      ? "bg-blue-50 border border-blue-200 shadow-sm ring-1 ring-blue-500/10"
                      : "bg-white border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300"
                  } ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar chữ cho mã tiền tệ */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm tracking-tight shrink-0 transition-colors ${
                      isSelected ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600"
                    }`}>
                      {c.code}
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={`font-semibold text-sm sm:text-base leading-tight ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                        {c.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider">
                          {t("currentLabel")}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Icon Check khi được chọn */}
                  {isSelected && (
                    <div className="shrink-0 animate-in zoom-in-50 duration-200">
                      <Check className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Footer chứa Action & Message */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            {message && (
              <div className={`text-xs font-semibold text-center p-3 mb-3 rounded-xl border animate-in slide-in-from-bottom-2 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : message.type === "warning"
                  ? "bg-amber-50 text-amber-700 border-amber-100"
                  : "bg-rose-50 text-rose-600 border-rose-100"
              }`}>
                {message.text}
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={isLoading || selected === currentCurrency}
              className="w-full h-12 rounded-full font-semibold text-base active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("processing")}
                </>
              ) : (
                t("saveButton")
              )}
            </Button>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}