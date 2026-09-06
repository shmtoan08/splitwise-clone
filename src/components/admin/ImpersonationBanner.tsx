"use client";

import { useTransition, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { stopImpersonation } from "@/actions/admin/impersonate";
import { Button } from "@/components/ui/button";
import { Headphones, LogOut, Loader2 } from "lucide-react";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const t = useTranslations("adminUsers");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isImpersonated = !!session?.user?.isImpersonated;

  useEffect(() => {
    if (isImpersonated) {
      document.documentElement.style.setProperty(
        "--impersonation-banner-height",
        "44px"
      );
    } else {
      document.documentElement.style.removeProperty(
        "--impersonation-banner-height"
      );
    }
    return () => {
      document.documentElement.style.removeProperty(
        "--impersonation-banner-height"
      );
    };
  }, [isImpersonated]);

  if (!isImpersonated) {
    return null;
  }

  const displayName =
    session.user.name || session.user.email || t("anonymous_user");

  const handleStop = () => {
    startTransition(async () => {
      try {
        // 1. Ưu tiên gọi API route cố định để tránh lỗi Server Action hash mismatch khi Next.js recompile
        const res = await fetch("/api/admin/impersonate", { method: "POST" });
        if (!res.ok) {
          await stopImpersonation();
        }
      } catch (err) {
        console.warn("API stop impersonation fallback to action:", err);
        try {
          await stopImpersonation();
        } catch (actionErr) {
          console.error("Action stop impersonation failed:", actionErr);
        }
      }

      // 2. Xóa CSS variable ngay lập tức
      document.documentElement.style.removeProperty(
        "--impersonation-banner-height"
      );

      // 3. Cập nhật session client
      await update();

      // 4. Chuyển hướng với full reload để xóa toàn bộ client/router cache của user được impersonate
      window.location.href = `/${locale}/admin/users`;
    });
  };

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full h-11 bg-amber-500 text-white font-medium text-xs sm:text-sm px-4 shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200 shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Headphones className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {t("impersonating_banner_text", { name: displayName })}
        </span>
      </div>

      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={handleStop}
        className="bg-white text-amber-700 hover:bg-amber-50 font-semibold text-xs rounded-lg h-7 px-2.5 sm:px-3 shrink-0 active:scale-95 transition-all shadow-xs border border-amber-200"
      >
        {isPending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">{t("exit_impersonation")}</span>
          </>
        ) : (
          <>
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("exit_impersonation")}</span>
          </>
        )}
      </Button>
    </div>
  );
}
