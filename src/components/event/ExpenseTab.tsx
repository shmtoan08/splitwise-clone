"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ExpenseForm from "./ExpenseForm";
import { Plus, ReceiptText, Calendar, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Participant = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  version: number;
  createdAt: Date;
  expenseDate?: Date;
  isCrossSubsidy: boolean;
  originalCurrency?: string | null;
  exchangeRate?: any;
  splitMode?: "AMOUNT" | "SHARES";
  splits: { participantId: string; amount: number }[];
};

type Group = {
  id: string;
  name: string;
  members: { participantId: string }[];
};

type Props = {
  eventId: string;
  participants: Participant[];
  expenses: Expense[];
  currency: string;
  groups?: Group[];
};

export default function ExpenseTab({ eventId, participants, expenses, currency, groups = [] }: Props) {
  const t = useTranslations("event");
  const tExpense = useTranslations("expense");

  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const handleOpenEdit = (exp: Expense) => {
    if (exp.isCrossSubsidy) return;
    setSelectedExpense(exp);
    setFormOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedExpense(undefined);
    setFormOpen(true);
  };

  return (
    <div className="flex-1 h-full relative overflow-hidden bg-slate-50">
      {/* Vùng cuộn danh sách: Padding bottom (pb-28 sm:pb-36) đủ lớn để không bị nút che mất thẻ cuối */}
      <div className="absolute inset-0 overflow-y-auto scrollbar-hide pb-28 sm:pb-36">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 text-sm gap-4 w-full mx-auto animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center">
              <ReceiptText className="w-10 h-10 text-slate-300" />
            </div>
            <p className="font-medium text-slate-500">{tExpense("noExpenses")}</p>
          </div>
        ) : (
          <ul className="space-y-3 p-3 sm:p-6 lg:p-8 w-full max-w-5xl mx-auto">
            {expenses.map((exp) => {
              const payer = participants.find((p) => p.id === exp.payerId)?.name || tExpense("anonymous");
              return (
                <li
                  key={exp.id}
                  onClick={() => handleOpenEdit(exp)}
                  className={`p-4 sm:p-5 bg-white border rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                    exp.isCrossSubsidy
                      ? "border-emerald-200 bg-emerald-50/50 shadow-sm cursor-default"
                      : "border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${exp.isCrossSubsidy ? 'bg-emerald-100' : 'bg-blue-50'}`}>
                        <ReceiptText className={`w-5 h-5 ${exp.isCrossSubsidy ? 'text-emerald-600' : 'text-blue-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">{exp.title}</h4>
                        {exp.isCrossSubsidy && (
                          <Badge className="mt-1 text-[9px] bg-emerald-100 text-emerald-700 border-transparent hover:bg-emerald-200">AUTO</Badge>
                        )}
                        {!exp.isCrossSubsidy && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(exp.expenseDate || exp.createdAt))}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end justify-center h-10">
                      <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
                        {formatCurrency(exp.amount, { currency })}
                      </span>
                      {exp.originalCurrency && exp.originalCurrency !== currency && (
                        <span className="block text-[10px] sm:text-xs text-slate-400 font-semibold">{exp.originalCurrency}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-2.5 mt-1 border border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 min-w-0">
                        <span className="text-slate-400 shrink-0">{tExpense("payer")}</span> 
                        <span className="font-semibold text-slate-700 truncate">{payer}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0 ml-2">
                        <Users className="w-3.5 h-3.5" />
                        <span>{tExpense("splitWith", { count: exp.splits.length })}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {exp.splits.map((s: any) => {
                        const pName = participants.find(p => p.id === s.participantId)?.name || "Unknown";
                        return (
                          <span key={s.participantId} className="px-2 py-0.5 border border-slate-200 bg-white rounded-md text-[11px] font-medium text-slate-600 shadow-sm truncate max-w-[120px]">
                            {pName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Expense Form */}
      {formOpen && (
        <ExpenseForm
          eventId={eventId}
          participants={participants}
          initialExpense={selectedExpense}
          open={formOpen}
          onOpenChange={setFormOpen}
          currency={currency}
          groups={groups}
          expensesCount={expenses.length}
        />
      )}

      {/* Floating Action Button (FAB): Đã cân chỉnh chuẩn Mobile 414px & Safe Area */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-40 w-full px-4">
        <button
          onClick={handleOpenAdd}
          className="pointer-events-auto bg-blue-600 text-white font-bold h-12 sm:h-14 px-5 sm:px-8 rounded-full shadow-[0_8px_25px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_12px_35px_rgba(37,99,235,0.45)] transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group whitespace-nowrap max-w-[90vw]"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-sm sm:text-base tracking-tight whitespace-nowrap">{t("addExpense")}</span>
        </button>
      </div>
    </div>
  );
}