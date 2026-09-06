"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AdminNavLinks } from "./AdminNavLinks";
import { Menu, ShieldCheck, Wallet } from "lucide-react";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Admin");

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen} side="left">
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl w-9 h-9 border-slate-200 text-slate-700"
              aria-label="Open Admin Menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          }
        />
        <SheetContent className="w-64 p-5 flex flex-col justify-between bg-white">
          <SheetHeader className="pb-4 mb-2 border-b border-slate-100 text-left">
            <div className="flex items-center gap-2.5 select-none">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-sm">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <SheetTitle className="font-bold text-base text-slate-800 tracking-tight">
                  Wari Admin
                </SheetTitle>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{t("badge")}</span>
                </span>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 flex flex-col min-h-0 pt-2">
            <AdminNavLinks onItemClick={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
