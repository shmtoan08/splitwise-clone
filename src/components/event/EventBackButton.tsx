"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

interface EventBackButtonProps {
  isAdmin?: boolean;
  showAdminBanner?: boolean;
}

function EventBackButtonContent({
  showAdminBanner = false,
}: EventBackButtonProps) {
  const tEvent = useTranslations("event");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();

  const isFromAdmin = searchParams.get("from") === "admin";
  const shouldReturnToAdmin = isFromAdmin || showAdminBanner;

  if (shouldReturnToAdmin) {
    return (
      <Link
        href="/admin/events"
        className={buttonVariants({
          variant: "ghost",
          className:
            "shrink-0 rounded-full h-10 px-2 sm:px-3 active:scale-95 transition-all -ml-2 hover:bg-purple-50 text-purple-700 hover:text-purple-900 group flex items-center gap-1.5",
        })}
      >
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5 text-purple-600" />
        <span className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold pr-1">
          <Shield className="w-3.5 h-3.5 text-purple-600" />
          <span>{tEvent("backToAdmin")}</span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={buttonVariants({
        variant: "ghost",
        className:
          "shrink-0 rounded-full h-10 px-2 sm:px-3 active:scale-95 transition-all -ml-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 group flex items-center gap-1.5",
      })}
    >
      <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
      <span className="hidden sm:block text-sm font-semibold pr-1">
        {tCommon("home")}
      </span>
    </Link>
  );
}

export default function EventBackButton(props: EventBackButtonProps) {
  return (
    <Suspense
      fallback={
        <div
          className={buttonVariants({
            variant: "ghost",
            className:
              "shrink-0 rounded-full h-10 px-2 sm:px-3 -ml-2 text-slate-600 flex items-center gap-1.5",
          })}
        >
          <ArrowLeft className="w-5 h-5" />
        </div>
      }
    >
      <EventBackButtonContent {...props} />
    </Suspense>
  );
}
