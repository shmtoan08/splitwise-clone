"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2 } from "lucide-react";

interface UserSearchBarProps {
  initialSearch?: string;
}

export function UserSearchBar({ initialSearch = "" }: UserSearchBarProps) {
  const t = useTranslations("adminUsers");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(initialSearch);

  const handleSearch = (term: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (term.trim()) {
        params.set("search", term.trim());
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setSearchValue("");
    handleSearch("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSearch(searchValue);
      }}
      className="relative flex items-center max-w-md w-full"
    >
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
            onClick={handleClear}
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
  );
}
