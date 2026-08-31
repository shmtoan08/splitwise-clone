"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import ExpenseForm from "./ExpenseForm";
import ReceiptViewerModal from "./ReceiptViewerModal";
import { 
  Plus, ReceiptText, Calendar, Users, FileText, CreditCard, 
  CopyPlus, Trash2, Loader2, Search, SlidersHorizontal, X, Lock 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { deleteExpense } from "@/actions/expense";
import { useAlert } from "@/providers/AlertProvider";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FilterSortModal from "@/components/shared/FilterSortModal";

type Participant = {
  id: string;
  name: string;
  deviceToken?: string | null;
  weight?: number;
  familyConfig?: any;
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
  splits: { participantId: string; amount: number; shares?: number | null }[];
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
  isLocked?: boolean;
  currentParticipantId?: string;
};

export default function ExpenseTab({ eventId, participants, expenses, currency, groups = [], isLocked = false, currentParticipantId }: Props) {
  const t = useTranslations("event");
  const tExpense = useTranslations("expense");
  const tCommon = useTranslations("common");
  const { showAlert } = useAlert();
  const { identity } = useParticipantIdentity(participants as any);
  const effectiveUserId = currentParticipantId || identity?.participantId;

  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; title: string } | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmExp, setDeleteConfirmExp] = useState<Expense | null>(null);

  const showLockedNotice = () => {
    showAlert({
      type: "info",
      title: t("lockedBadge", { fallback: "Đã khóa" }),
      message: t("eventLockedError", { fallback: "Sự kiện đã bị khóa. Chỉ người tạo nhóm mới có thể mở khóa để chỉnh sửa." }),
    });
  };

  // --- FILTER & SORT STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPayerId, setFilterPayerId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // --- CORE LOGIC: FILTER & SORT ---
  const filteredAndSortedExpenses = useMemo(() => {
    let result = [...expenses];

    // 1. Lọc theo tên (Tìm kiếm)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q));
    }

    // 2. Lọc theo người chi trả
    if (filterPayerId !== "all") {
      result = result.filter((e) => e.payerId === filterPayerId);
    }

    // 3. Sắp xếp
    result.sort((a, b) => {
      // Ưu tiên các phần liên quan đến user lên trước, không tham gia ra sau
      if (effectiveUserId) {
        const aInvolved = a.isCrossSubsidy || a.payerId === effectiveUserId || a.splits.some((s) => s.participantId === effectiveUserId);
        const bInvolved = b.isCrossSubsidy || b.payerId === effectiveUserId || b.splits.some((s) => s.participantId === effectiveUserId);
        if (aInvolved !== bInvolved) {
          return aInvolved ? -1 : 1;
        }
      }

      const dateA = new Date(a.expenseDate || a.createdAt).getTime();
      const dateB = new Date(b.expenseDate || b.createdAt).getTime();
      const createA = new Date(a.createdAt).getTime();
      const createB = new Date(b.createdAt).getTime();

      switch (sortBy) {
        case "date_desc": return dateB - dateA; // Ngày chi trả (Mới nhất)
        case "date_asc": return dateA - dateB;  // Ngày chi trả (Cũ nhất)
        case "created_desc": return createB - createA; // Ngày tạo (Mới thêm)
        case "amount_desc": return b.amount - a.amount; // Tiền cao nhất
        case "title_asc": return a.title.localeCompare(b.title); // Tên A-Z
        default: return 0;
      }
    });

    return result;
  }, [expenses, searchQuery, filterPayerId, sortBy, effectiveUserId]);

  const hasActiveFilters = filterPayerId !== "all" || sortBy !== "date_desc";

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterPayerId("all");
    setSortBy("date_desc");
  };

  const handleDeleteClick = (e: React.MouseEvent, exp: Expense) => {
    e.stopPropagation();
    if (isLocked) {
      showLockedNotice();
      return;
    }
    setDeleteConfirmExp(exp);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmExp) return;
    setIsDeletingId(deleteConfirmExp.id);
    await deleteExpense(deleteConfirmExp.id, eventId);
    setIsDeletingId(null);
    setDeleteConfirmExp(null);
  };

  const handleOpenEdit = (exp: Expense) => {
    if (exp.isCrossSubsidy) return;
    if (isLocked) {
      showLockedNotice();
      return;
    }
    setSelectedExpense(exp);
    setFormOpen(true);
  };

  const handleOpenAdd = () => {
    if (isLocked) {
      showLockedNotice();
      return;
    }
    setSelectedExpense(undefined);
    setFormOpen(true);
  };

  return (
    // THAY ĐỔI KIẾN TRÚC LAYOUT: Dùng flex-col thay vì absolute để gắn thanh Tìm kiếm tự nhiên hơn
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      
      {/* --- THANH TÌM KIẾM & BỘ LỌC (STICKY HEADER) --- */}
      {expenses.length > 0 && (
        <div className="shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-200/60 z-20 px-3 sm:px-6 py-2.5 sm:py-3 shadow-sm">
          <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={tExpense("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsFilterModalOpen(true)}
                className={`w-11 h-11 rounded-xl p-0 relative shrink-0 transition-all ${hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                {hasActiveFilters && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
                )}
              </Button>
            </div>

            {/* HIỂN THỊ CÁC BỘ LỌC ĐANG BẬT */}
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {filterPayerId !== "all" && (
                  <Badge variant="secondary" onClick={() => setFilterPayerId("all")} className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent text-xs px-2.5 py-1 rounded-lg cursor-pointer shrink-0">
                    {tExpense("filterPayerPrefix", { name: participants.find(p => p.id === filterPayerId)?.name || "" })} <X className="w-3 h-3 ml-1 inline" />
                  </Badge>
                )}
                {sortBy !== "date_desc" && (
                  <Badge variant="secondary" onClick={() => setSortBy("date_desc")} className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent text-xs px-2.5 py-1 rounded-lg cursor-pointer shrink-0">
                    {sortBy === "created_desc" && tExpense("sortCreatedDesc", { fallback: "Ngày thêm (Mới nhất)" })}
                    {sortBy === "amount_desc" && tExpense("sortAmountDesc", { fallback: "Số tiền (Cao nhất)" })}
                    {sortBy === "title_asc" && tExpense("sortTitleAsc", { fallback: "Tên (A-Z)" })}
                    {sortBy === "date_asc" && tExpense("sortDateAsc", { fallback: "Ngày chi (Cũ nhất)" })}
                    <X className="w-3 h-3 ml-1 inline" />
                  </Badge>
                )}
                <button type="button" onClick={clearAllFilters} className="text-[11px] font-medium text-slate-400 hover:text-slate-700 whitespace-nowrap ml-1 underline underline-offset-2 shrink-0">
                  {tCommon("clearFilter", { fallback: "Xóa lọc" })}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- DANH SÁCH CHI TIÊU --- */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-28 sm:pb-36 relative">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 text-sm gap-4 w-full mx-auto animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center">
              <ReceiptText className="w-10 h-10 text-slate-300" />
            </div>
            <p className="font-medium text-slate-500">{tExpense("noExpenses")}</p>
          </div>
        ) : filteredAndSortedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[40vh] text-slate-400 text-sm gap-3 w-full mx-auto animate-in fade-in">
            <Search className="w-10 h-10 text-slate-300" />
            <p className="font-medium">Không tìm thấy khoản chi phù hợp.</p>
            <Button variant="link" onClick={clearAllFilters} className="text-blue-600">Xóa bộ lọc</Button>
          </div>
        ) : (
          <ul className="space-y-3 p-3 sm:p-6 lg:p-8 w-full max-w-5xl mx-auto">
            {filteredAndSortedExpenses.map((exp) => {
              const payer = participants.find((p) => p.id === exp.payerId)?.name || tExpense("anonymous");
              
              // --- LOGIC XÁC ĐỊNH TRẠNG THÁI CỦA USER HIỆN TẠI ---
              const isPayer = effectiveUserId ? exp.payerId === effectiveUserId : false;
              const mySplit = effectiveUserId 
                ? exp.splits.find((s) => s.participantId === effectiveUserId) 
                : null;
              const isParticipant = !isPayer && !!mySplit;
              const isNotInvolved = !!effectiveUserId && !isPayer && !isParticipant;

              // --- BỘ PHONG CÁCH UI CHO TỪNG TRẠNG THÁI (TRÁNH GÂY RỐI MẮT) ---
              let cardStyle = "border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer";
              
              if (exp.isCrossSubsidy) {
                cardStyle = "border-emerald-200 bg-emerald-50/50 shadow-sm cursor-default";
              } else if (isPayer) {
                // 1. Bạn đã trả: Viền trái xanh dương, nền xanh rất nhạt
                cardStyle = "border-slate-200/80 border-l-[4px] border-l-blue-600 bg-blue-50/30 shadow-sm hover:shadow-md cursor-pointer";
              } else if (isParticipant) {
                // 2. Bạn gánh/tham gia: Viền trái xanh lá, nền trắng
                cardStyle = "border-slate-200/80 border-l-[4px] border-l-emerald-500 bg-white shadow-sm hover:shadow-md cursor-pointer";
              } else if (isNotInvolved) {
                // 3. Không tham gia: Viền rõ ràng như các thẻ khác
                cardStyle = "border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:border-slate-300 cursor-pointer";
              }
              
              // Tính tổng số phần và trung bình chi phí mỗi phần
              const totalShares = exp.splits.reduce((sum, s) => {
                if (s.shares != null && s.shares > 0) {
                  return sum + s.shares;
                }
                const p = participants.find(part => part.id === s.participantId);
                return sum + (p?.weight && p.weight > 0 ? p.weight : 1);
              }, 0);

              const formattedShares = Number.isInteger(totalShares) ? totalShares : Number(totalShares.toFixed(2));
              const avgPerShare = totalShares > 0 ? Math.round(exp.amount / totalShares) : 0;

              return (
                <li
                  key={exp.id}
                  onClick={() => handleOpenEdit(exp)}
                  className={`p-4 sm:p-5 border rounded-2xl transition-all duration-200 active:scale-[0.98] ${cardStyle}`}
                >
                  <div className="flex justify-between items-start mb-3 gap-3 sm:gap-4">
                    {/* KHỐI BÊN TRÁI: ICON HOẶC BILL */}
                    <div className="shrink-0 mt-0.5">
                      {!exp.isCrossSubsidy && exp.receiptUrl ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingReceipt({ url: exp.receiptUrl!, title: exp.title });
                          }}
                          className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-blue-600 hover:bg-blue-100 active:scale-95 transition-all shadow-sm group"
                        >
                          <FileText className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform" /> 
                          <span className="text-[6px] font-black uppercase tracking-wider">{tExpense("receipt", { fallback: "Bill" })}</span>
                        </button>
                      ) : (
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                          exp.isCrossSubsidy ? 'bg-emerald-100' : isPayer ? 'bg-blue-100' : 'bg-slate-100'
                        }`}>
                          {exp.isCrossSubsidy ? (
                            <ReceiptText className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <CreditCard className={`w-5 h-5 ${isPayer ? 'text-blue-600' : 'text-slate-400'}`} /> 
                          )}
                        </div>
                      )}
                    </div>

                    {/* KHỐI GIỮA: TÊN, NGÀY THÁNG & BADGE TRẠNG THÁI */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">
                          {exp.title}
                        </h4>

                        {/* PHÂN BIỆT RÕ 3 TRẠNG THÁI */}
                        {isPayer && (
                          <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200/80 font-bold px-2 py-0.5 shadow-2xs">
                            {tExpense("yourShare", { fallback: "Phần của bạn" })}: {formatCurrency(mySplit ? mySplit.amount : 0, { currency })}
                          </Badge>
                        )}
                        {isParticipant && mySplit && (
                          <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold px-2 py-0.5 shadow-2xs">
                            {tExpense("yourShare", { fallback: "Phần của bạn" })}: {formatCurrency(mySplit.amount, { currency })}
                          </Badge>
                        )}
                        {isNotInvolved && (
                          <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-50 border-slate-200 font-medium px-2 py-0.5">
                            {tExpense("notInvolved", { fallback: "Không tham gia" })}
                          </Badge>
                        )}
                      </div>

                      {exp.isCrossSubsidy ? (
                        <Badge className="mt-1.5 text-[9px] bg-emerald-100 text-emerald-700 border-transparent">
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

                    {/* KHỐI PHẢI: SỐ TIỀN */}
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
                        <span className={`font-semibold truncate ${isPayer ? 'text-blue-600 font-bold' : 'text-slate-700'}`}>
                          {isPayer ? `${payer} (Bạn)` : payer}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0 ml-2">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{tExpense("sharesLabel", { count: formattedShares, fallback: `${formattedShares} phần` })}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-indigo-600 font-bold">~{formatCurrency(avgPerShare, { currency })}/{tExpense("shareUnit", { fallback: "phần" })}</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-2 mt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {exp.splits.map((s: any) => {
                          const p = participants.find(part => part.id === s.participantId);
                          const isMeInSplit = effectiveUserId && p?.id === effectiveUserId;
                          const pName = p?.name || "Unknown";
                          const pShare = s.shares != null && s.shares > 0 ? s.shares : (p?.weight && p.weight > 0 ? p.weight : 1);
                          
                          return (
                            <span 
                              key={s.participantId} 
                              className={`px-2 py-0.5 border rounded-md text-[11px] font-medium shadow-2xs truncate max-w-[140px] flex items-center gap-1 ${
                                isMeInSplit 
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold" 
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}
                            >
                              <span>{isMeInSplit ? `${pName} (Bạn)` : pName}</span>
                              {pShare !== 1 && (
                                <span className={`text-[10px] font-bold px-1 rounded ${isMeInSplit ? 'text-emerald-800 bg-emerald-100' : 'text-indigo-600 bg-indigo-50'}`}>
                                  x{pShare}
                                </span>
                              )}
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
                              if (isLocked) {
                                showLockedNotice();
                                return;
                              }
                              setSelectedExpense({ ...exp, id: undefined as any, version: 1, receiptUrl: null });
                              setFormOpen(true);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-100 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all text-blue-600 shadow-sm group ${
                              isLocked ? "opacity-50" : ""
                            }`}
                          >
                            <CopyPlus className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-semibold">{tExpense("clone", { fallback: "Nhân bản" })}</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, exp)}
                            disabled={isDeletingId === exp.id}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-100 bg-red-50 hover:bg-red-100 active:scale-95 transition-all text-red-500 shadow-sm disabled:opacity-50 group ${
                              isLocked ? "opacity-50" : ""
                            }`}
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

      {/* --- NÚT THÊM MỚI (FAB) HOẶC THÔNG BÁO KHÓA --- */}
      {!isLocked ? (
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-40 w-full px-4">
          <button
            onClick={handleOpenAdd}
            className="pointer-events-auto bg-blue-600 text-white font-bold h-12 sm:h-14 px-5 sm:px-8 rounded-full shadow-[0_8px_25px_rgba(37,99,235,0.35)] hover:bg-blue-700 hover:shadow-[0_12px_35px_rgba(37,99,235,0.45)] transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group whitespace-nowrap max-w-[90vw]"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm sm:text-base tracking-tight whitespace-nowrap">{t("addExpense")}</span>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-40 w-full px-4">
          <span className="pointer-events-auto inline-flex items-center gap-2 bg-slate-800/90 text-white px-5 py-3 rounded-full text-xs sm:text-sm font-medium shadow-xl backdrop-blur-sm">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{tExpense("lockedNoticeFloating", { fallback: "Sự kiện đã chốt sổ, không thể thêm chi tiêu" })}</span>
          </span>
        </div>
      )}

      {/* --- MODAL BỘ LỌC & SẮP XẾP --- */}
      <FilterSortModal
        isOpen={isFilterModalOpen}
        onClose={setIsFilterModalOpen}
        title={tExpense("filterModalTitle", { fallback: "Lọc & Sắp xếp" })}
        sortTitle={tExpense("sortBy", { fallback: "Sắp xếp theo" })}
        sortOptions={[
          { id: "date_desc", label: tExpense("sortDateDesc", { fallback: "Ngày chi (Mới nhất)" }) },
          { id: "created_desc", label: tExpense("sortCreatedDesc", { fallback: "Ngày thêm (Mới nhất)" }) },
          { id: "amount_desc", label: tExpense("sortAmountDesc", { fallback: "Số tiền (Cao nhất)" }) },
          { id: "title_asc", label: tExpense("sortTitleAsc", { fallback: "Tên (A-Z)" }) },
        ]}
        currentSort={sortBy}
        onSortChange={setSortBy}
        filterTitle={tExpense("filterByPayer", { fallback: "Lọc theo người trả" })}
        filterOptions={[
          { id: "all", label: tExpense("allPayers", { fallback: "Tất cả" }) },
          ...participants.map(p => ({ id: p.id, label: p.name }))
        ]}
        currentFilter={filterPayerId}
        onFilterChange={setFilterPayerId}
      />

      {/* --- CÁC MODAL KHÁC --- */}
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
              {tExpense("deleteConfirmMessage", { fallback: "Bạn chắc chắn muốn xóa chi tiêu này?" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 mt-4 sm:space-x-0">
            <Button type="button" variant="destructive" className="w-full rounded-full h-12 font-bold" onClick={confirmDelete}>
              {tCommon("delete", { fallback: "Xóa" })}
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-full h-12 font-bold bg-white" onClick={() => setDeleteConfirmExp(null)}>
              {tCommon("cancel", { fallback: "Hủy" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}