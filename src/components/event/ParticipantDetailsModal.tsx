"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Calendar, Receipt, Users, ArrowUpRight, ArrowDownLeft } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: any;
  expenses: any[];
  participants: any[];
  currency: string;
  balance: number;
};

export default function ParticipantDetailsModal({ open, onOpenChange, participant, expenses, participants, currency, balance }: Props) {
  const [activeTab, setActiveTab] = useState<"paid" | "owed">("owed");

  const participantMap = useMemo(() => {
    const map = new Map();
    participants.forEach(p => map.set(p.id, p.name));
    return map;
  }, [participants]);

  const { paidExpenses, owedExpenses } = useMemo(() => {
    if (!participant) return { paidExpenses: [], owedExpenses: [] };
    
    const paid = expenses.filter(e => e.payerId === participant.id).sort((a, b) => new Date(b.expenseDate || b.createdAt).getTime() - new Date(a.expenseDate || a.createdAt).getTime());
    const owed = expenses.filter(e => e.splits.some((s: any) => s.participantId === participant.id)).sort((a, b) => new Date(b.expenseDate || b.createdAt).getTime() - new Date(a.expenseDate || a.createdAt).getTime());
    
    return { paidExpenses: paid, owedExpenses: owed };
  }, [participant, expenses]);

  if (!participant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] h-[85vh] rounded-3xl p-0 overflow-hidden flex flex-col bg-slate-50">
        <DialogHeader className="p-4 sm:p-6 pb-4 bg-white border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="flex justify-between items-center w-full mt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-xl">{participant.name}</span>
            </div>
            
            <div className="text-right">
              <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${balance < 0 ? "text-rose-600" : balance > 0 ? "text-emerald-600" : "text-slate-600"}`}>
                {balance > 0 ? "+" : ""}{formatCurrency(balance, { currency: currency })}
              </span>
            </div>
          </DialogTitle>
          
          <div className="flex gap-2 mt-4 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab("owed")}
              className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === "owed" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Tham gia ({owedExpenses.length})
            </button>
            <button 
              onClick={() => setActiveTab("paid")}
              className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === "paid" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Ứng trước ({paidExpenses.length})
            </button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {activeTab === "paid" && (
            paidExpenses.length > 0 ? paidExpenses.map((ex) => (
              <div key={ex.id} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-emerald-50 w-10 h-10 rounded-full flex justify-center items-center shrink-0">
                      <Receipt className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">{ex.title}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(ex.expenseDate || ex.createdAt))}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-extrabold text-emerald-600 text-sm sm:text-base tracking-tight">
                      {formatCurrency(ex.amount, { currency: currency })}
                    </span>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-2.5 mt-1 border border-slate-100 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>Thành viên tham gia ({ex.splits.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.splits.map((s: any) => (
                      <span key={s.participantId} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-600">
                        {participantMap.get(s.participantId) || "Unknown"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center text-sm font-medium text-slate-400 py-10">Bạn không có khoản ứng trước nào.</div>
            )
          )}

          {activeTab === "owed" && (
            owedExpenses.length > 0 ? owedExpenses.map((ex) => {
              const mySplit = ex.splits.find((s: any) => s.participantId === participant.id);
              return (
                <div key={ex.id} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-rose-50 w-10 h-10 rounded-full flex justify-center items-center shrink-0">
                        <Receipt className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">{ex.title}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(ex.expenseDate || ex.createdAt))}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="font-extrabold text-rose-600 text-sm sm:text-base tracking-tight">
                        {formatCurrency(mySplit?.amount || 0, { currency: currency })}
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-0.5">Phần phải gánh</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-2.5 mt-1 border border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>Tổng chi: <span className="font-bold text-slate-700">{formatCurrency(ex.amount, { currency: currency })}</span> ({ex.splits.length} người)</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {ex.splits.map((s: any) => (
                        <span key={s.participantId} className={`px-2 py-0.5 border rounded-md text-[11px] font-medium ${s.participantId === participant.id ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-slate-200 text-slate-600"}`}>
                          {participantMap.get(s.participantId) || "Unknown"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-sm font-medium text-slate-400 py-10">Bạn chưa tham gia sự kiện nào.</div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
