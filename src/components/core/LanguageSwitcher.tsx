"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const t = useTranslations("Core");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  
  const currentLocale = (params.locale as string) || "vi";

  function switchLocale(newLocale: string) {
    router.replace(
      // @ts-expect-error - dynamic params matching
      { pathname, params }, 
      { locale: newLocale }
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 h-8 flex items-center justify-center transition-all active:scale-95" 
        aria-label={t("switch_language")}
      >
        {currentLocale.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-slate-200 p-1">
        <DropdownMenuItem onClick={() => switchLocale("vi")} className={`flex items-center justify-between cursor-pointer rounded-md p-2.5 font-medium text-sm transition-colors hover:bg-slate-50 hover:text-slate-900 ${currentLocale === "vi" ? "text-slate-900 font-bold" : "text-slate-600"}`}>
          <span>{t("lang_vi")}</span>
          {currentLocale === "vi" && <Check className="w-4 h-4 text-emerald-600" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLocale("ja")} className={`flex items-center justify-between cursor-pointer rounded-md p-2.5 font-medium text-sm transition-colors hover:bg-slate-50 hover:text-slate-900 ${currentLocale === "ja" ? "text-slate-900 font-bold" : "text-slate-600"}`}>
          <span>{t("lang_ja")}</span>
          {currentLocale === "ja" && <Check className="w-4 h-4 text-emerald-600" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
