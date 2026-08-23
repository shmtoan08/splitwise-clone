"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ExpenseForm from "./ExpenseForm";
import { Wallet, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  splits: { participantId: string; amount: number }[];
};

type Props = {
  eventId: string;
  participants: Participant[];
  expenses: Expense[];
  currency: string;
};

export default function ExpenseTab({ eventId, participants, expenses, currency }: Props) {
  const t = useTranslations("event");
  const tExpense = useTranslations("expense");
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const handleOpenEdit = (exp: Expense) => {
    setSelectedExpense(exp);
    setFormOpen(true);
  };

  const handleOpenAdd = () => {
    setSelectedExpense(undefined);
    setFormOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide bg-slate-50 relative pb-28">
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 text-sm gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-slate-300" />
          </div>
          {tExpense("noExpenses")}
        </div>
      ) : (
        <ul className="space-y-3 p-4">
          {expenses.map((exp) => {
            const payer = participants.find((p) => p.id === exp.payerId)?.name || tExpense("anonymous");
            return (
              <li
                key={exp.id}
                onClick={() => handleOpenEdit(exp)}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2 gap-4">
                  <h4 className="font-semibold text-slate-900 leading-tight">{exp.title}</h4>
                  <span className="font-bold text-slate-900 font-mono shrink-0">
                    {formatCurrency(exp.amount, { currency })}
                  </span>
                </div>
                <div className="text-sm text-slate-500 flex justify-between items-end">
                  <span>
                    {tExpense("payer")} <span className="font-medium text-slate-700">{payer}</span>
                  </span>
                  <span className="text-[11px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {tExpense("splitWith", { count: exp.splits.length })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 1 Form duy nhất dùng chung cho Add và Edit */}
      {formOpen && (
        <ExpenseForm
          eventId={eventId}
          participants={participants}
          initialExpense={selectedExpense}
          open={formOpen}
          onOpenChange={setFormOpen}
          currency={currency}
        />
      )}

      {/* Nút Add */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none px-4 z-10">
        <button
          onClick={handleOpenAdd}
          className="pointer-events-auto bg-blue-600 text-white font-medium h-14 px-8 rounded-full shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:bg-blue-700 hover:shadow-[0_12px_24px_rgba(37,99,235,0.35)] transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-6 h-6" />
          <span className="text-lg">{t("expenses")}</span>
        </button>
      </div>
    </div>
  );
}
