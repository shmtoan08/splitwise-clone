"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Receipt, ArrowLeftRight, Wallet } from "lucide-react";

import MembersTabClient from "./MembersTabClient";
import ExpenseTab from "./ExpenseTab";
import BalancesTabClient from "./BalancesTabClient";
import SettlementTabClient from "./SettlementTabClient";

type Props = {
  event: any; 
  isCreator?: boolean;
};

export default function EventTabsClient({ event, isCreator }: Props) {
  const t = useTranslations("event");
  const [activeTab, setActiveTab] = useState("members");

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
        {/* SỬA LỖI 1: Thêm `shrink-0` để Flexbox không bao giờ ép bẹp Header này. Tăng nhẹ padding pb-3 */}
        <div className="px-2 sm:px-4 pt-3 pb-3 bg-white border-b shadow-sm z-10 shrink-0 sticky top-0">
          <TabsList className="w-full grid grid-cols-4 h-auto p-1.5 bg-slate-100/80 rounded-2xl">
            
            {/* SỬA LỖI 2: Thêm `h-auto`, sửa lại khoảng cách gap và đệm cho chữ */}
            <TabsTrigger 
              value="members" 
              className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 h-auto rounded-xl transition-all active:scale-95 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 whitespace-normal"
            >
              <Users className="w-5 h-5 shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight line-clamp-2">{t("members")}</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="expenses" 
              className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 h-auto rounded-xl transition-all active:scale-95 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 whitespace-normal"
            >
              <Receipt className="w-5 h-5 shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight line-clamp-2">{t("expenses")}</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="balances" 
              className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 h-auto rounded-xl transition-all active:scale-95 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 whitespace-normal"
            >
              <Wallet className="w-5 h-5 shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight line-clamp-2">{t("balancesTab")}</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="settlement" 
              className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 h-auto rounded-xl transition-all active:scale-95 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 whitespace-normal"
            >
              <ArrowLeftRight className="w-5 h-5 shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight line-clamp-2">{t("settlement")}</span>
            </TabsTrigger>
            
          </TabsList>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 relative overflow-hidden bg-slate-50">
          <TabsContent value="members" className="absolute inset-0 m-0 data-[state=inactive]:hidden flex flex-col animate-in fade-in duration-300">
            <MembersTabClient event={event} isCreator={isCreator} />
          </TabsContent>

          <TabsContent value="expenses" className="absolute inset-0 m-0 data-[state=inactive]:hidden flex flex-col animate-in fade-in duration-300">
            <ExpenseTab eventId={event.id} participants={event.participants} expenses={event.expenses} currency={event.baseCurrency} groups={event.groups} isLocked={event.isLocked} />
          </TabsContent>

          <TabsContent value="balances" className="absolute inset-0 m-0 data-[state=inactive]:hidden flex flex-col overflow-y-auto animate-in fade-in duration-300">
            <BalancesTabClient event={event} isCreator={isCreator} />
          </TabsContent>

          <TabsContent value="settlement" className="absolute inset-0 m-0 data-[state=inactive]:hidden flex flex-col overflow-y-auto animate-in fade-in duration-300">
            <SettlementTabClient event={event} isCreator={isCreator} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}