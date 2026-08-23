"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CurrencySwitcher() {
  const t = useTranslations("Core");
  const router = useRouter();
  const [currency, setCurrency] = useState("VND");

  useEffect(() => {
    // Đọc cookie khi client mount
    const match = document.cookie.match(new RegExp('(^| )NEXT_LOCALE_CURRENCY=([^;]+)'));
    if (match && match[2]) {
      setCurrency(match[2]);
    }
  }, []);

  function switchCurrency(newCurrency: string) {
    // Lưu vào cookie với thời hạn 1 năm
    document.cookie = `NEXT_LOCALE_CURRENCY=${newCurrency}; path=/; max-age=31536000`;
    setCurrency(newCurrency);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 h-8 flex items-center justify-center transition-all active:scale-95" 
        aria-label={t("switch_currency")}
      >
        {currency}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-slate-200 p-1">
        <DropdownMenuItem onClick={() => switchCurrency("VND")} className={`flex items-center justify-between cursor-pointer rounded-md p-2.5 font-medium text-sm transition-colors hover:bg-slate-50 hover:text-slate-900 ${currency === "VND" ? "text-slate-900 font-bold" : "text-slate-600"}`}>
          <span>{t("currency_vnd")}</span>
          {currency === "VND" && <Check className="w-4 h-4 text-emerald-600" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchCurrency("JPY")} className={`flex items-center justify-between cursor-pointer rounded-md p-2.5 font-medium text-sm transition-colors hover:bg-slate-50 hover:text-slate-900 ${currency === "JPY" ? "text-slate-900 font-bold" : "text-slate-600"}`}>
          <span>{t("currency_jpy")}</span>
          {currency === "JPY" && <Check className="w-4 h-4 text-emerald-600" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
