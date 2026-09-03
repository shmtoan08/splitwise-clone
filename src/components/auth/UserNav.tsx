"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, ChevronDown, Loader2 } from "lucide-react";

interface UserNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  className?: string;
}

export function UserNav({ user, className }: UserNavProps) {
  const t = useTranslations("Core");
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = user.name || user.email || t("my_account");
  const avatarInitial = (user.name || user.email || "U").charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({
          variant: "outline",
          className: `rounded-full flex items-center gap-2 shadow-2xs hover:shadow-xs hover:border-emerald-300 active:scale-95 transition-all h-9 px-2.5 sm:px-3.5 cursor-pointer bg-white select-none ${className || ""}`,
        })}
        aria-label={displayName}
      >
        {user.image ? (
          <img
            src={user.image}
            alt={displayName}
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-[11px] shadow-2xs">
            {avatarInitial}
          </div>
        )}
        <span className="max-w-[100px] sm:max-w-[140px] truncate text-sm font-medium text-slate-700">
          {displayName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 -ml-0.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 p-1.5 rounded-2xl shadow-lg border-slate-200 bg-white"
      >
        <div className="px-2.5 py-2 select-none">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-slate-900 leading-none truncate">
              {user.name || t("my_account")}
            </p>
            {user.email && (
              <p className="text-xs text-slate-500 truncate leading-none mt-0.5">
                {user.email}
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="my-1 bg-slate-100" />

        <DropdownMenuItem
          className="cursor-pointer px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-50 focus:text-slate-900 transition-colors"
          onClick={() => router.push("/dashboard")}
        >
          <LayoutDashboard className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t("dashboard_button")}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-slate-100" />

        <DropdownMenuItem
          variant="destructive"
          disabled={isLoggingOut}
          className="cursor-pointer px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus:bg-rose-50 focus:text-rose-700 transition-colors"
          onClick={handleSignOut}
        >
          {isLoggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <LogOut className="w-4 h-4 shrink-0" />
          )}
          <span>{t("logout_button")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
