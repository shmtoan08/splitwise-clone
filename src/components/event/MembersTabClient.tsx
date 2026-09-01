"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import { addParticipant, deleteParticipant, updateParticipantName, resetParticipantIdentity } from "@/actions/participant";
import { updateParticipantBudgets } from "@/actions/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, User, Settings2, Users, Wallet, Trash2, Pencil, Search, SlidersHorizontal, X, Lock, RotateCcw } from "lucide-react";
import { useAlert } from "@/providers/AlertProvider";
import PaymentInfoForm from "@/components/event/PaymentInfoForm";
import GroupManageModal from "./GroupManageModal";
import FamilyConfigModal from "./FamilyConfigModal";
import { formatCurrency } from "@/lib/utils";
import BudgetManageModal from "./BudgetManageModal";
import FilterSortModal from "@/components/shared/FilterSortModal";

type PaymentInfo = {
  bankBIN: string | null;
  accountNumber: string | null;
  accountName: string | null;
  paypayLink: string | null;
} | null;

type BudgetMode = "FIXED" | "UNLIMITED" | "SELF_FUNDED";

type Participant = {
  id: string;
  name: string;
  deviceToken: string | null;
  budgetMode?: BudgetMode;
  budget?: number;
  paymentInfo?: PaymentInfo;
  weight?: number;
  familyConfig?: any;
};

type Group = {
  id: string;
  name: string;
  members: { participantId: string }[];
};

type Props = {
  event: {
    id: string;
    isAdvancedMode: boolean;
    isLocked?: boolean;
    baseCurrency: string;
    avgBudget?: number | null;
    participants: Participant[];
    groups: Group[];
  };
  isCreator?: boolean;
};

export default function MembersTabClient({ event, isCreator }: Props) {
  const { id: eventId, isAdvancedMode, participants, groups, baseCurrency, avgBudget } = event;
  const isLocked = !!event.isLocked;
  const t = useTranslations("participant");
  const tPayment = useTranslations("paymentInfo");
  const tCommon = useTranslations("common");
  const tGroup = useTranslations("group");
  const tBudget = useTranslations("budget");
  const { isCurrentParticipant } = useParticipantIdentity(participants);
  const { showAlert } = useAlert();

  const showLockedNotice = () => {
    showAlert({
      type: "info",
      title: tCommon("error") || "Đã khóa",
      message: "Sự kiện đã bị khóa. Chỉ người tạo nhóm mới có thể mở khóa để chỉnh sửa.",
    });
  };

  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [familyConfigParticipantId, setFamilyConfigParticipantId] = useState<string | null>(null);

  // --- FILTER & SORT STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroupId, setFilterGroupId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"group_name" | "name_asc" | "name_desc">("group_name");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const realParticipants = participants.filter(p => p.name !== "🏢 Quỹ Công ty");
  
  const filteredAndSortedParticipants = useMemo(() => {
    let result = [...realParticipants];

    // 1. Tìm kiếm theo tên thành viên hoặc tên nhóm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const matchName = p.name.toLowerCase().includes(q);
        const pGroups = groups.filter((g) => g.members.some((m) => m.participantId === p.id));
        const matchGroup = pGroups.some((g) => g.name.toLowerCase().includes(q));
        return matchName || matchGroup;
      });
    }

    // 2. Lọc theo nhóm
    if (filterGroupId !== "all") {
      if (filterGroupId === "no_group") {
        result = result.filter((p) => !groups.some((g) => g.members.some((m) => m.participantId === p.id)));
      } else {
        result = result.filter((p) => {
          const grp = groups.find((g) => g.id === filterGroupId);
          return grp?.members.some((m) => m.participantId === p.id);
        });
      }
    }

    // 3. Sắp xếp
    const getFirstGroupName = (pId: string) => {
      const pGroups = groups.filter((g) => g.members.some((m) => m.participantId === pId));
      if (pGroups.length === 0) return "zzzzzz"; // Thành viên không thuộc nhóm nào xếp ở cuối
      return pGroups[0].name.toLowerCase();
    };

    result.sort((a, b) => {
      // 1. Bản thân (Me) LUÔN LUÔN nằm ở trên cùng
      const aIsMe = isCurrentParticipant(a.id);
      const bIsMe = isCurrentParticipant(b.id);
      if (aIsMe && !bIsMe) return -1;
      if (!aIsMe && bIsMe) return 1;

      // 2. User vừa được thêm (recentlyAddedId) ưu tiên nằm ở ĐẦU nhóm "Thành viên khác" (ngay dưới Bạn)
      if (recentlyAddedId) {
        if (a.id === recentlyAddedId) return -1;
        if (b.id === recentlyAddedId) return 1;
      }

      // Sắp xếp theo nhóm rồi theo tên (mặc định)
      if (sortBy === "group_name") {
        const grpA = getFirstGroupName(a.id);
        const grpB = getFirstGroupName(b.id);
        const grpCompare = grpA.localeCompare(grpB, "vi", { sensitivity: "base" });
        if (grpCompare !== 0) return grpCompare;
        return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
      }

      // Sắp xếp theo tên A - Z
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
      }

      // Sắp xếp theo tên Z - A
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name, "vi", { sensitivity: "base" });
      }

      return 0;
    });

    return result;
  }, [realParticipants, searchQuery, filterGroupId, sortBy, groups, isCurrentParticipant, recentlyAddedId]);

  const hasActiveFilters = searchQuery.trim().length > 0 || filterGroupId !== "all" || sortBy !== "group_name";
  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterGroupId("all");
    setSortBy("group_name");
  };

  const totalBudget = realParticipants.reduce((sum, p) => sum + (p.budgetMode === "FIXED" ? (p.budget || 0) : 0), 0);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [totalInput, setTotalInput] = useState("");
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number>>({});
  
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [inlineBudgetStr, setInlineBudgetStr] = useState("");

  const handleAddMember = async () => {
    if (isLocked) {
      showLockedNotice();
      return;
    }
    const trimmed = newName.trim();
    if (!trimmed) {
      setError(tCommon("error"));
      return;
    }

    setIsAdding(true);
    setError(null);
    
    const result = await addParticipant({ eventId, name: trimmed, isSelf: false });
    if (!result.success) {
      setError(result.error);
    } else {
      setNewName("");
      if (result.data?.participantId) {
        setRecentlyAddedId(result.data.participantId);
      }
    }
    
    setIsAdding(false);
  };

  const handleCreateGroup = () => {
    if (isLocked) {
      showLockedNotice();
      return;
    }
    setSelectedGroup(null);
    setGroupModalOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    if (isLocked) {
      showLockedNotice();
      return;
    }
    setSelectedGroup(group);
    setGroupModalOpen(true);
  };

  const openBudgetModal = () => {
    if (isLocked) {
      showLockedNotice();
      return;
    }
    const drafts: Record<string, number> = {};
    realParticipants.forEach(p => drafts[p.id] = p.budget || 0);
    setDraftBudgets(drafts);
    setTotalInput(totalBudget.toString());
    setIsBudgetModalOpen(true);
  };

  const handleSplitEvenly = () => {
    const total = parseInt(totalInput) || 0;
    if (total <= 0 || realParticipants.length === 0) return;

    const count = realParticipants.length;
    const base = Math.floor(total / count);
    const remainder = total % count;

    const newDrafts: Record<string, number> = {};
    realParticipants.forEach((p, idx) => {
      newDrafts[p.id] = base + (idx === 0 ? remainder : 0);
    });
    setDraftBudgets(newDrafts);
  };

  const saveBudgets = async (budgetsToSave: Record<string, number>) => {
    if (isLocked) {
      showLockedNotice();
      return;
    }
    const payload = Object.entries(budgetsToSave).map(([participantId, amount]) => ({
      participantId,
      budgetMode: "FIXED" as BudgetMode,
      budget: amount,
    }));
    await updateParticipantBudgets({ eventId, budgets: payload });
  };

  const handleSaveBudgetModal = async () => {
    await saveBudgets(draftBudgets);
    setIsBudgetModalOpen(false);
  };

  const startInlineEdit = (p: Participant) => {
    if (isLocked) {
      showLockedNotice();
      return;
    }
    setEditingParticipantId(p.id);
    setInlineBudgetStr((p.budget || 0).toString());
  };

  const saveInlineEdit = async (p: Participant) => {
    setEditingParticipantId(null);
    const newAmount = parseInt(inlineBudgetStr) || 0;
    if (newAmount !== p.budget) {
      const drafts: Record<string, number> = {};
      realParticipants.forEach(rp => {
        if (rp.id === p.id) {
          drafts[rp.id] = newAmount;
        } else {
          drafts[rp.id] = rp.budget || 0;
        }
      });
      await saveBudgets(drafts);
    }
  };

  const [editingNameParticipantId, setEditingNameParticipantId] = useState<string | null>(null);
  const [inlineNameStr, setInlineNameStr] = useState("");

  const startInlineNameEdit = (p: Participant) => {
    if (isLocked) {
      showLockedNotice();
      return;
    }
    setEditingNameParticipantId(p.id);
    setInlineNameStr(p.name);
  };

  const saveInlineNameEdit = async (p: Participant) => {
    setEditingNameParticipantId(null);
    const trimmed = inlineNameStr.trim();
    
    if (trimmed && trimmed !== p.name) {
      const res = await updateParticipantName({
        eventId,
        participantId: p.id,
        name: trimmed,
      });
      
      if (!res.success) {
        showAlert({
          type: "error",
          title: tCommon("error") || "Lỗi",
          message: res.error,
        });
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative bg-slate-50 overflow-hidden">
      {/* --- THANH TÌM KIẾM & BỘ LỌC (STICKY HEADER) --- */}
      {realParticipants.length > 0 && (
        <div className="shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-200/60 z-20 px-3 sm:px-6 py-2.5 sm:py-3 shadow-sm">
          <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={t("searchPlaceholder", { fallback: "Tìm tên thành viên hoặc nhóm..." })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-400"
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
                className={`w-11 h-11 rounded-xl p-0 relative shrink-0 transition-all ${hasActiveFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                {hasActiveFilters && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white"></span>
                )}
              </Button>
            </div>

            {/* HIỂN THỊ CÁC BỘ LỌC ĐANG BẬT */}
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {filterGroupId !== "all" && (
                  <Badge variant="secondary" onClick={() => setFilterGroupId("all")} className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent text-xs px-2.5 py-1 rounded-lg cursor-pointer shrink-0">
                    Nhóm: {filterGroupId === "no_group" ? t("noGroup", { fallback: "Chưa vào nhóm" }) : groups.find(g => g.id === filterGroupId)?.name} <X className="w-3 h-3 ml-1 inline" />
                  </Badge>
                )}
                {sortBy !== "group_name" && (
                  <Badge variant="secondary" onClick={() => setSortBy("group_name")} className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent text-xs px-2.5 py-1 rounded-lg cursor-pointer shrink-0">
                    {sortBy === "name_asc" && t("sortByNameAsc", { fallback: "Tên (A - Z)" })}
                    {sortBy === "name_desc" && t("sortByNameDesc", { fallback: "Tên (Z - A)" })}
                    <X className="w-3 h-3 ml-1 inline" />
                  </Badge>
                )}
                <button type="button" onClick={clearAllFilters} className="text-[11px] font-medium text-slate-400 hover:text-slate-700 whitespace-nowrap ml-1 underline underline-offset-2 shrink-0">
                  {t("clearFilter", { fallback: "Xóa lọc" })}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vùng nội dung cuộn */}
      <div className="flex-1 px-3 sm:px-6 py-4 overflow-y-auto pb-28 sm:pb-36 scrollbar-hide">
        
        {/* Header Actions Bar (Đã cân bằng lề trái & đổi màu Indigo) */}
        {(isAdvancedMode || participants.length > 2) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2 mb-4 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            
            {/* Vế Trái: Hiện Tổng ngân sách (Chế độ Nâng cao) HOẶC Tiêu đề + Badge đếm nhóm (Chế độ Cơ bản) */}
            <div className="flex items-center gap-2 min-w-0">
              {isAdvancedMode ? (
                <div className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1.5 truncate">
                  <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{tBudget("totalBudget", { fallback: "Tổng ngân sách" })}:</span>
                  <span className="font-bold text-slate-900 font-mono sm:font-sans">
                    {formatCurrency(totalBudget, { currency: baseCurrency })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Thành viên & Nhóm</span>
                  {groups.length > 0 && (
                    <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      {groups.length} nhóm
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Vế Phải: Cụm nút hành động (Trải đều/căn phải linh hoạt trên mobile) */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              {participants.length > 2 && (
                <Button
                  onClick={handleCreateGroup}
                  variant="outline"
                  className="rounded-full bg-indigo-50/80 border-indigo-200/80 text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all text-xs h-8 px-3 font-semibold shadow-2xs"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                  <span>{tGroup("createGroup")}</span>
                </Button>
              )}

              {isAdvancedMode && (
                <Button
                  onClick={openBudgetModal}
                  variant="outline"
                  className="rounded-full bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all text-xs h-8 px-3 font-semibold"
                >
                  {tBudget("manageBudget", { fallback: "Quản lý Ngân sách" })}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Members List */}
        {realParticipants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
            {t("noMembers")}
          </div>
        ) : filteredAndSortedParticipants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm gap-2">
            <Search className="w-8 h-8 text-slate-300" />
            <p className="font-medium">{t("searchEmpty", { fallback: "Không tìm thấy thành viên phù hợp." })}</p>
            <Button variant="link" onClick={clearAllFilters} className="text-indigo-600 font-semibold">{t("clearFilter", { fallback: "Xóa bộ lọc" })}</Button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filteredAndSortedParticipants.map((p) => {
              const isMe = isCurrentParticipant(p.id);
              const isJustAdded = recentlyAddedId === p.id;
              const pGroups = groups.filter(g => g.members.some(m => m.participantId === p.id));
              
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all ${
                    isMe 
                      ? "bg-emerald-50/60 border-emerald-300/80 shadow-sm ring-1 ring-emerald-500/10" 
                      : isJustAdded
                        ? "bg-indigo-50/40 border-indigo-300/80 shadow-sm ring-1 ring-indigo-500/20 animate-in fade-in slide-in-from-top-2 duration-300"
                        : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  {/* Avatar & Trạng thái nhận diện */}
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                      isMe 
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isMe ? <User size={18} /> : p.name.charAt(0).toUpperCase()}
                    </div>
                    {p.name !== "🏢 Quỹ Công ty" && (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white shadow-2xs ${
                          p.deviceToken ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={p.deviceToken ? t("deviceLinked") : t("deviceUnclaimed")}
                      />
                    )}
                  </div>

                  {/* Thông tin chính */}
                  <div className="flex-1 min-w-0">
                    {/* Hàng 1: Tên thành viên + Badge Bạn + Trạng thái nhận diện + Nút Sửa tên */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      {editingNameParticipantId === p.id ? (
                        <Input
                          autoFocus
                          type="text"
                          className="h-7 text-xs sm:text-sm py-0 bg-white rounded-lg border-indigo-400 focus-visible:ring-indigo-500 w-full max-w-[200px]"
                          value={inlineNameStr}
                          onChange={(e) => setInlineNameStr(e.target.value)}
                          onBlur={() => saveInlineNameEdit(p)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlineNameEdit(p)}
                        />
                      ) : (
                        <p className="font-bold text-slate-900 text-sm sm:text-base truncate" title={p.name}>
                          {p.name}
                        </p>
                      )}
                      
                      {isMe && (
                        <Badge className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0">
                          {t("youLabel")}
                        </Badge>
                      )}

                      {/* Trạng thái liên kết thiết bị */}
                      {p.name !== "🏢 Quỹ Công ty" && !isMe && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1 border shrink-0 ${
                            p.deviceToken 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                          title={p.deviceToken ? t("deviceLinked") : t("deviceUnclaimed")}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.deviceToken ? "bg-emerald-500" : "bg-slate-400"}`} />
                          <span className="hidden sm:inline">{p.deviceToken ? t("deviceLinked") : t("deviceUnclaimed")}</span>
                        </span>
                      )}

                      {/* Nút Sửa tên */}
                      {(isCreator || isMe) && p.name !== "🏢 Quỹ Công ty" && editingNameParticipantId !== p.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 w-6 h-6 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all p-0 -ml-0.5"
                          title="Sửa tên"
                          onClick={() => startInlineNameEdit(p)}
                        >
                          <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                        </Button>
                      )}
                    </div>

                    {/* Hàng 2: Ngân sách + Nhóm + Thông tin ngân hàng */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {/* Tag Ngân sách cá nhân (Advanced Mode) */}
                      {isAdvancedMode && (
                        <div className="inline-flex items-center">
                          {editingParticipantId === p.id ? (
                            <Input
                              autoFocus
                              type="number"
                              className="w-24 h-6 text-xs py-0 text-right bg-white rounded-md border-emerald-400 focus-visible:ring-emerald-500"
                              value={inlineBudgetStr}
                              onChange={(e) => setInlineBudgetStr(e.target.value)}
                              onBlur={() => saveInlineEdit(p)}
                              onKeyDown={(e) => e.key === "Enter" && saveInlineEdit(p)}
                            />
                          ) : (
                            <span 
                              className="text-[11px] sm:text-xs font-semibold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 px-2 py-0.5 rounded-md cursor-pointer transition-colors" 
                              onClick={() => startInlineEdit(p)}
                              title="Bấm để sửa ngân sách"
                            >
                              💰 {formatCurrency(p.budget || 0, { currency: baseCurrency })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tag Nhóm */}
                      {pGroups.map((g, idx) => {
                        const colorVariants = ["bg-slate-100 text-slate-700", "bg-indigo-50 text-indigo-700", "bg-amber-50 text-amber-700"];
                        return (
                          <Badge
                            key={g.id}
                            onClick={() => handleEditGroup(g)}
                            className={`cursor-pointer transition-opacity border-transparent text-[10px] font-medium px-2 py-0.5 rounded-md ${colorVariants[idx % colorVariants.length]}`}
                          >
                            🏷️ {g.name}
                          </Badge>
                        );
                      })}
                      
                      {/* Thông tin tài khoản ngân hàng */}
                      {isMe && p.paymentInfo?.accountNumber && (
                        <span className="text-[11px] text-emerald-800/90 font-medium flex items-center gap-1 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/60 truncate max-w-full">
                          <span>🏦</span> {p.paymentInfo.accountNumber} ({p.paymentInfo.accountName || p.paymentInfo.bankBIN})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cột các nút hành động bên phải */}
                  <div className="shrink-0 flex items-center gap-1">
                    {/* Nút Cấu hình gia đình */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (isLocked) {
                          showLockedNotice();
                          return;
                        }
                        setFamilyConfigParticipantId(p.id);
                      }}
                      className={`h-8 sm:h-9 rounded-full px-2 sm:px-2.5 transition-all ${
                        p.weight && p.weight > 1 
                          ? 'bg-indigo-100/80 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 shadow-2xs font-bold' 
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      } ${isLocked ? "opacity-60" : ""}`}
                      title={t("familyConfigTitle")}
                    >
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {p.weight && p.weight > 1 && (
                        <span className="ml-1 text-[11px] sm:text-xs font-bold">x{p.weight}</span>
                      )}
                    </Button>

                    {/* Nút Cài đặt tài khoản nhận tiền (cho bản thân) */}
                    {isMe && (
                      <Dialog open={openDialogId === p.id} onOpenChange={(open) => setOpenDialogId(open ? p.id : null)}>
                        <DialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-500 active:scale-95 transition-all border border-slate-200/60"
                              title={t("setupPayment")}
                            />
                          }
                        >
                          <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="sr-only">{t("setupPayment")}</span>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-900 text-center">{tPayment("dialogTitle")}</DialogTitle>
                          </DialogHeader>
                          <PaymentInfoForm 
                            eventId={eventId} 
                            currency={baseCurrency}
                            currentPaymentInfo={p.paymentInfo ?? null} 
                            onSuccess={() => setOpenDialogId(null)} 
                          />
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Nút Hủy liên kết thiết bị (Reset vai trò) */}
                    {isCreator && !isMe && !!p.deviceToken && p.name !== "🏢 Quỹ Công ty" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full text-amber-600 hover:bg-amber-50 hover:text-amber-700 active:scale-95 transition-all ${isLocked ? "opacity-60" : ""}`}
                        title={t("resetIdentityTitle")}
                        onClick={() => {
                          if (isLocked) {
                            showLockedNotice();
                            return;
                          }
                          showAlert({
                            type: "warning",
                            title: t("resetIdentityTitle"),
                            message: t("resetIdentityConfirm"),
                            confirmText: t("resetIdentityConfirmBtn"),
                            onConfirm: async () => {
                              const res = await resetParticipantIdentity(eventId, p.id);
                              if (!res.success) {
                                if (res.error === "CANNOT_RESET_CREATOR") {
                                  showAlert({ type: "error", title: tCommon("error") || "Lỗi", message: t("cannotResetCreator") });
                                } else {
                                  showAlert({ type: "error", title: tCommon("error") || "Lỗi", message: tCommon("unauthorized") || "Không có quyền thực hiện." });
                                }
                              } else {
                                showAlert({ type: "success", title: tCommon("success") || "Thành công", message: t("resetIdentitySuccess") });
                              }
                            }
                          });
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    )}

                    {/* Nút Xóa thành viên */}
                    {isCreator && !isMe && p.name !== "🏢 Quỹ Công ty" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all ${isLocked ? "opacity-60" : ""}`}
                        title={t("deleteMemberTitle")}
                        onClick={() => {
                          if (isLocked) {
                            showLockedNotice();
                            return;
                          }
                          showAlert({
                            type: "warning",
                            title: t("deleteMemberTitle"),
                            message: t("deleteMemberConfirm"),
                            confirmText: tCommon("delete") || "Xóa",
                            onConfirm: async () => {
                              const res = await deleteParticipant(eventId, p.id);
                              if (!res.success) {
                                if (res.error === "CANNOT_DELETE_CREATOR") {
                                  showAlert({ type: "error", title: tCommon("error") || "Lỗi", message: t("cannotDeleteCreator") || "Bạn không thể tự xóa bản thân vì bạn là chủ sự kiện này!" });
                                } else if (res.error === "HAS_EXPENSES") {
                                  showAlert({ type: "error", title: tCommon("error") || "Lỗi", message: t("memberHasExpenses") });
                                } else {
                                  showAlert({ type: "error", title: tCommon("error") || "Lỗi", message: tCommon("unauthorized") || "Không có quyền thực hiện." });
                                }
                              } else {
                                showAlert({ type: "success", title: tCommon("success") || "Thành công", message: t("deleteMemberSuccess") });
                              }
                            }
                          });
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* FOOTER NEO CỐ ĐỊNH Ở ĐÁY MÀN HÌNH (Floating Absolute Bar giống ExpenseTab) */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-40 w-full px-4">
        <div className="pointer-events-auto max-w-xl mx-auto w-full flex flex-col items-center">
          {!isLocked ? (
            <>
              {error && (
                <div className="mb-2 bg-rose-50 text-rose-600 text-xs font-semibold px-3 py-1 rounded-full border border-rose-100 shadow-sm animate-in slide-in-from-bottom-2">
                  {error}
                </div>
              )}
              
              {/* Thanh Input hợp nhất co giãn linh hoạt */}
              <div className="relative flex items-center bg-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200/90 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-1 sm:p-1.5 w-full backdrop-blur-md">
                <div className="pl-3 pr-1.5 text-slate-400 shrink-0">
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                  placeholder={t("addMemberPlaceholder")}
                  className="flex-1 h-9 sm:h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-base sm:text-sm px-0 placeholder:text-slate-400 min-w-0"
                  disabled={isAdding}
                />
                
                <Button
                  onClick={handleAddMember}
                  disabled={isAdding || !newName.trim()}
                  className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm active:scale-95 transition-all shrink-0 ml-1.5 whitespace-nowrap shadow-sm"
                >
                  <span>{t("addButton")}</span>
                </Button>
              </div>
            </>
          ) : (
            <span className="inline-flex items-center gap-2 bg-slate-800/90 text-white px-5 py-2.5 rounded-full text-xs font-medium shadow-xl backdrop-blur-sm">
              <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Sự kiện đã chốt sổ, không thể thêm thành viên</span>
            </span>
          )}
        </div>
      </div>

      {/* Modals */}
      <GroupManageModal 
        open={groupModalOpen} 
        onOpenChange={setGroupModalOpen} 
        eventId={eventId} 
        participants={participants} 
        group={selectedGroup}
        existingGroups={groups}
      />

      <FamilyConfigModal
        eventId={eventId}
        participant={participants.find(p => p.id === familyConfigParticipantId)}
        open={!!familyConfigParticipantId}
        onOpenChange={(open) => !open && setFamilyConfigParticipantId(null)}
      />

      {/* Filter & Sort Dialog */}
      <FilterSortModal
        isOpen={isFilterModalOpen}
        onClose={setIsFilterModalOpen}
        title={t("filterModalTitle", { fallback: "Sắp xếp & Bộ lọc" })}
        sortTitle={t("sortBy", { fallback: "Sắp xếp theo" })}
        sortOptions={[
          { id: "group_name", label: t("sortByGroup", { fallback: "Mặc định (Theo Nhóm)" }) },
          { id: "name_asc", label: t("sortByNameAsc", { fallback: "Tên (A - Z)" }) },
          { id: "name_desc", label: t("sortByNameDesc", { fallback: "Tên (Z - A)" }) },
        ]}
        currentSort={sortBy}
        onSortChange={(val) => setSortBy(val as any)}
        filterTitle={t("filterByGroup", { fallback: "Lọc theo nhóm" })}
        filterOptions={
          groups.length > 0 
            ? [
                { id: "all", label: t("allGroups", { fallback: "Tất cả" }) },
                ...groups.map(g => ({ id: g.id, label: `${g.name} (${g.members.length})` })),
                { id: "no_group", label: t("noGroup", { fallback: "Chưa vào nhóm" }) }
              ] 
            : undefined
        }
        currentFilter={filterGroupId}
        onFilterChange={setFilterGroupId}
      />

      <BudgetManageModal
        open={isBudgetModalOpen}
        onOpenChange={setIsBudgetModalOpen}
        eventId={eventId}
        baseCurrency={baseCurrency}
        avgBudget={avgBudget}
        participants={participants}
      />
    </div>
  );
}