"use client";

import { useTransition, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEvent } from "@/actions/event";
import { ArrowRight, Users, Loader2, Sparkles } from "lucide-react";
import { detectCurrencyFromLocation } from "@/lib/currencies";

export default function CreateEventForm() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Tự động khởi tạo tiền tệ dựa trên vị trí địa lý / múi giờ
  const [currency, setCurrency] = useState<string>("VND");

  useEffect(() => {
    const detectedCurrency = detectCurrencyFromLocation(locale);
    setCurrency(detectedCurrency);
  }, [locale]);

  const handleSubmit = (formData: FormData) => {
    const title = formData.get("title")?.toString().trim();
    if (!title) {
      setError(tCommon("error"));
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createEvent({ title, currency });
      if (result && result.success && result.data?.eventId) {
        router.push(`/e/${result.data.eventId}`);
      } else if (result && !result.success) {
        setError(result.error);
      }
    });
  };

  return (
    <form action={handleSubmit} className="w-full max-w-md mx-auto space-y-3.5">
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          {/* Leading Icon: Giúp ô nhập trực quan hơn */}
          <Users className="absolute left-4 sm:left-5 w-5 h-5 text-slate-400 pointer-events-none shrink-0" />
          
          <Input
            name="title"
            placeholder={t("groupNamePlaceholder")}
            required
            maxLength={100}
            disabled={isPending}
            onChange={() => {
              if (error) setError(null);
            }}
            className="w-full h-14 sm:h-16 pl-12 sm:pl-14 pr-5 text-base sm:text-lg font-medium rounded-2xl bg-white border-2 border-slate-200/90 shadow-md shadow-slate-200/50 hover:border-slate-300 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/20 text-slate-800 placeholder:text-slate-400 transition-all"
          />
        </div>
      </div>
      
      {/* Thông báo lỗi */}
      {error && (
        <div className="text-red-500 text-xs sm:text-sm text-center font-semibold bg-rose-50 border border-rose-100 p-3 rounded-2xl animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

      {/* Primary CTA Button */}
      <Button 
        type="submit" 
        size="lg"
        disabled={isPending}
        className="group rounded-2xl w-full h-14 sm:h-16 text-base sm:text-lg font-bold shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/35 active:scale-[0.98] transition-all bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 border-0 flex items-center justify-center gap-2 text-white"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <span>{tCommon("loading")}</span>
          </>
        ) : (
          <>
            <span>{t("createGroup")}</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </Button>
    </form>
  );
}