"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LayoutDashboard, Users, CalendarRange, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNavLinksProps {
  onItemClick?: () => void;
}

export function AdminNavLinks({ onItemClick }: AdminNavLinksProps) {
  const t = useTranslations("Admin.menu");
  const pathname = usePathname();

  const navItems = [
    {
      label: t("dashboard"),
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: t("users"),
      href: "/admin/users",
      icon: Users,
      exact: false,
    },
    {
      label: t("events"),
      href: "/admin/events",
      icon: CalendarRange,
      exact: false,
    },
  ];

  return (
    <div className="flex flex-col justify-between h-full">
      {/* Main navigation */}
      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Quay lại App */}
      <div className="pt-4 border-t border-slate-200/80 mt-auto">
        <Link
          href="/"
          onClick={onItemClick}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:-translate-x-0.5 transition-transform shrink-0" />
          <span>{t("backToApp")}</span>
        </Link>
      </div>
    </div>
  );
}
