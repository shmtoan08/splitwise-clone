"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, Receipt, Landmark } from "lucide-react";

export default function EventTabsNav({ eventId }: { eventId: string }) {
  const t = useTranslations("event");
  const pathname = usePathname();

  // Route matches
  const isSettlement = pathname.endsWith("/settlement");
  const isExpenses = pathname.endsWith("/expenses");
  // Default to members if it's precisely /e/[eventId]
  const isMembers = !isSettlement && !isExpenses;

  const baseClasses = "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all rounded-full active:scale-95";
  const activeClasses = "bg-white text-slate-900 shadow-sm font-bold";
  const inactiveClasses = "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50";

  return (
    <div className="px-4 py-3 border-b bg-white">
      <div className="flex w-full bg-slate-100 p-1 rounded-full">
        <Link 
          href={`/e/${eventId}`}
          className={`${baseClasses} ${isMembers ? activeClasses : inactiveClasses}`}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">{t("members")}</span>
        </Link>
        <Link 
          href={`/e/${eventId}/expenses`}
          className={`${baseClasses} ${isExpenses ? activeClasses : inactiveClasses}`}
        >
          <Receipt className="w-4 h-4" />
          <span className="hidden sm:inline">{t("expenses")}</span>
        </Link>
        <Link 
          href={`/e/${eventId}/settlement`}
          className={`${baseClasses} ${isSettlement ? activeClasses : inactiveClasses}`}
        >
          <Landmark className="w-4 h-4" />
          <span className="hidden sm:inline">{t("settlement")}</span>
        </Link>
      </div>
    </div>
  );
}
