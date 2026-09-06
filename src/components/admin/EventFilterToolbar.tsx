"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Search, X, Loader2, Filter } from "lucide-react";

interface EventFilterToolbarProps {
  initialSearch?: string;
  initialStatus?: string;
}

export function EventFilterToolbar({
  initialSearch = "",
  initialStatus = "ALL",
}: EventFilterToolbarProps) {
  const t = useTranslations("adminEvents");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(initialSearch);
  const currentStatus = searchParams.get("status") || initialStatus || "ALL";

  const updateFilters = (newSearch: string, newStatus: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newSearch.trim()) {
        params.set("search", newSearch.trim());
      } else {
        params.delete("search");
      }

      if (newStatus && newStatus !== "ALL") {
        params.set("status", newStatus);
      } else {
        params.delete("status");
      }

      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchValue, currentStatus);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    updateFilters("", currentStatus);
  };

  const handleStatusChange = (status: string | null) => {
    const selected = status || "ALL";
    updateFilters(searchValue, selected);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-2xl">
      {/* 1. Ô tìm kiếm */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          disabled={isPending}
          className="pl-9 pr-16 h-10 rounded-xl bg-white border-slate-200 text-sm shadow-xs focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {isPending && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 mr-1" />
          )}
        </div>
      </form>

      {/* 2. Dropdown lọc trạng thái */}
      <div className="sm:w-48 shrink-0">
        <Select
          value={currentStatus}
          onValueChange={handleStatusChange}
          disabled={isPending}
        >
          <SelectTrigger className="h-10 w-full rounded-xl bg-white border-slate-200 text-sm font-medium shadow-xs px-3 focus:ring-emerald-500">
            <div className="flex items-center gap-2 truncate">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <SelectValue placeholder={t("status_all")} />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 shadow-md">
            <SelectItem value="ALL" className="text-sm font-medium">
              {t("status_all")}
            </SelectItem>
            <SelectItem value="ACTIVE" className="text-sm font-medium text-emerald-700">
              {t("status_active")}
            </SelectItem>
            <SelectItem value="LOCKED" className="text-sm font-medium text-rose-700">
              {t("status_locked")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
