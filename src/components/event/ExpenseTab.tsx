"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ExpenseForm from "./ExpenseForm";
import ReceiptViewerModal from "./ReceiptViewerModal";
import { Plus, ReceiptText, Calendar, Users, FileText, CreditCard, CopyPlus, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { deleteExpense } from "@/actions/expense";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  receiptUrl?: string | null;
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
  const tCommon = useTranslations("common");

  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; title: string } | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmExp, setDeleteConfirmExp] = useState<Expense | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, exp: Expense) => {
    e.stopPropagation();
    setDeleteConfirmExp(exp);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmExp) return;
    setIsDeletingId(deleteConfirmExp.id);
    const expId = deleteConfirmExp.id;
    setDeleteConfirmExp(null); // Đóng modal ngay
    await deleteExpense(expId, eventId);
    setIsDeletingId(null);
  };

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
                  <div className="flex justify-between items-start mb-3 gap-3 sm:gap-4">
                    {/* TRÁI: NÚT XEM HÓA ĐƠN HOẶC ICON MẶC ĐỊNH */}
                    <div className="shrink-0 mt-0.5">
                      {!exp.isCrossSubsidy && exp.receiptUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Chặn mở Form Edit
                            setViewingReceipt({ url: exp.receiptUrl!, title: exp.title });
                          }}
                          // Thiết kế nút bự, bo góc vuông vắn để giống "Thumbnail"
                          className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-blue-600 hover:bg-blue-100 hover:border-blue-200 active:scale-95 transition-all shadow-sm group"
                        >
                          <FileText className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform" /> 
                          <span className="text-[9px] font-black uppercase tracking-wider">{tExpense("receipt", { fallback: "Bill" })}</span>
                        </button>
                      ) : (
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${exp.isCrossSubsidy ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                          {exp.isCrossSubsidy ? (
                            <ReceiptText className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <CreditCard className="w-5 h-5 text-slate-300" /> 
                          )}
                        </div>
                      )}
                    </div>

                    {/* GIỮA: TIÊU ĐỀ & NGÀY THÁNG (Đã được làm sạch) */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <h4 className="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">
                        {exp.title}
                      </h4>
                      {exp.isCrossSubsidy ? (
                        <Badge className="mt-1.5 text-[9px] bg-emerald-100 text-emerald-700 border-transparent hover:bg-emerald-200">
                          AUTO
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1.5">
                          <span>
                            {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(exp.expenseDate || exp.createdAt))}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* PHẢI: SỐ TIỀN TỔNG (Giữ nguyên của bạn) */}
                    <div className="text-right shrink-0 flex flex-col items-end justify-center h-11">
                      <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
                        {formatCurrency(exp.amount, { currency })}
                      </span>
                      {exp.originalCurrency && exp.originalCurrency !== currency && (
                        <span className="block text-[10px] sm:text-xs text-slate-400 font-semibold mt-0.5">
                          {exp.originalCurrency}
                        </span>
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
                    <div className="flex items-end justify-between gap-2 mt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {exp.splits.map((s: any) => {
                          const pName = participants.find(p => p.id === s.participantId)?.name || "Unknown";
                          return (
                            <span key={s.participantId} className="px-2 py-0.5 border border-slate-200 bg-white rounded-md text-[11px] font-medium text-slate-600 shadow-sm truncate max-w-[120px]">
                              {pName}
                            </span>
                          );
                        })}
                      </div>
                      
                      {!exp.isCrossSubsidy && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExpense({
                                ...exp,
                                id: undefined as any,
                                version: 1,
                                receiptUrl: null
                              });
                              setFormOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-100 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all text-blue-600 shadow-sm group"
                          >
                            <CopyPlus className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-semibold">{tExpense("clone", { fallback: "Nhân bản" })}</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, exp)}
                            disabled={isDeletingId === exp.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-100 bg-red-50 hover:bg-red-100 active:scale-95 transition-all text-red-500 shadow-sm disabled:opacity-50 group"
                          >
                            {isDeletingId === exp.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            )}
                            <span className="text-[11px] font-semibold">{tCommon("delete", { fallback: "Xóa" })}</span>
                          </button>
                        </div>
                      )}
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

      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-40 w-full px-4">
        <button
          onClick={handleOpenAdd}
          className="pointer-events-auto bg-blue-600 text-white font-bold h-12 sm:h-14 px-5 sm:px-8 rounded-full shadow-[0_8px_25px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_12px_35px_rgba(37,99,235,0.45)] transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group whitespace-nowrap max-w-[90vw]"
        >
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-sm sm:text-base tracking-tight whitespace-nowrap">{t("addExpense")}</span>
        </button>
      </div>

      <ReceiptViewerModal
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        imageUrl={viewingReceipt?.url || ""}
        title={viewingReceipt?.title || ""}
      />

      <Dialog open={!!deleteConfirmExp} onOpenChange={(open) => !open && setDeleteConfirmExp(null)}>
        <DialogContent className="max-w-xs rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">{tExpense("deleteConfirmTitle", { fallback: "Xóa chi tiêu?" })}</DialogTitle>
            <DialogDescription className="text-center text-slate-500 mt-2">
              {tExpense("deleteConfirmMessage", { fallback: "Bạn có chắc chắn muốn xóa chi tiêu này không?" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 mt-4 sm:space-x-0">
            <Button
              type="button"
              variant="destructive"
              className="w-full rounded-full h-12 font-bold"
              onClick={confirmDelete}
            >
              {tCommon("delete", { fallback: "Xóa" })}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full h-12 font-bold bg-white"
              onClick={() => setDeleteConfirmExp(null)}
            >
              {tCommon("cancel", { fallback: "Hủy" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}