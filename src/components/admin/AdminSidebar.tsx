"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { AdminNavLinks } from "./AdminNavLinks";
import { ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const t = useTranslations("Admin");

  return (
    <aside
      className={cn(
        "w-64 bg-white border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0 shadow-xs",
        className
      )}
    >
      <div className="flex flex-col h-full">
        {/* Brand Header */}
        <div className="pb-6 mb-4 border-b border-slate-100">
          <Link href="/admin" className="flex items-center gap-2.5 select-none group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-800 tracking-tight block">
                Wari Admin
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <ShieldCheck className="w-3 h-3" />
                <span>{t("badge")}</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col min-h-0">
          <AdminNavLinks />
        </div>
      </div>
    </aside>
  );
}
