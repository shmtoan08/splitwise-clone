"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface EventPaginationProps {
  currentPage: number;
  totalPages: number;
  totalEvents: number;
}

export function EventPagination({
  currentPage,
  totalPages,
  totalEvents,
}: EventPaginationProps) {
  const t = useTranslations("adminEvents");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (totalPages <= 1 && totalEvents <= 10) {
    return (
      <div className="text-xs text-slate-500 font-medium">
        {t("pagination_info", {
          current: currentPage,
          total: totalPages,
          count: totalEvents,
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      <div className="text-xs text-slate-500 font-medium order-2 sm:order-1">
        {t("pagination_info", {
          current: currentPage,
          total: totalPages,
          count: totalEvents,
        })}
      </div>

      <div className="flex items-center gap-2 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className="h-8 px-3 rounded-lg text-xs font-semibold border-slate-200 text-slate-700 disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          <span>{t("pagination_prev")}</span>
        </Button>

        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded-md text-slate-700">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          className="h-8 px-3 rounded-lg text-xs font-semibold border-slate-200 text-slate-700 disabled:opacity-40"
        >
          <span>{t("pagination_next")}</span>
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
