"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import { addParticipant, deleteParticipant } from "@/actions/participant";
import { updateParticipantBudgets } from "@/actions/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, User, Settings2, Users, Wallet, Trash2 } from "lucide-react";
import { useAlert } from "@/providers/AlertProvider";
import PaymentInfoForm from "@/components/event/PaymentInfoForm";
import GroupManageModal from "./GroupManageModal";
import FamilyConfigModal from "./FamilyConfigModal";
import { formatCurrency } from "@/lib/utils";

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
    participants: Participant[];
    groups: Group[];
  };
  isCreator?: boolean;
};

export default function MembersTabClient({ event, isCreator }: Props) {
  const { id: eventId, isAdvancedMode, participants, groups } = event;
  const t = useTranslations("participant");
  const tPayment = useTranslations("paymentInfo");
  const tCommon = useTranslations("common");
  const tGroup = useTranslations("group");
  const tBudget = useTranslations("budget");
  const { isCurrentParticipant } = useParticipantIdentity(participants);
  const { showAlert } = useAlert();

  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [familyConfigParticipantId, setFamilyConfigParticipantId] = useState<string | null>(null);

  const realParticipants = participants.filter(p => p.name !== "🏢 Quỹ Công ty");
  
  const sortedParticipants = [...realParticipants].sort((a, b) => {
    const aIsMe = isCurrentParticipant(a.id);
    const bIsMe = isCurrentParticipant(b.id);
    if (aIsMe && !bIsMe) return -1;
    if (!aIsMe && bIsMe) return 1;
    return 0;
  });

  const totalBudget = realParticipants.reduce((sum, p) => sum + (p.budgetMode === "FIXED" ? (p.budget || 0) : 0), 0);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [totalInput, setTotalInput] = useState("");
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number>>({});
  
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [inlineBudgetStr, setInlineBudgetStr] = useState("");

  const handleAddMember = async () => {
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
    }
    
    setIsAdding(false);
  };

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setGroupModalOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group);
    setGroupModalOpen(true);
  };

  const openBudgetModal = () => {
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

  return (
    <div className="flex-1 flex flex-col h-full relative bg-slate-50 overflow-hidden">
      {/* Vùng nội dung cuộn */}
      <div className="flex-1 px-3 sm:px-6 py-4 overflow-y-auto pb-4 scrollbar-hide">
        
       {/* Header Actions Bar (Đã cân bằng lề trái & đổi màu Indigo) */}
        {(isAdvancedMode || participants.length > 2) && (
          <div className="flex items-center justify-between gap-2 mb-4 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            
            {/* Vế Trái: Hiện Tổng ngân sách (Chế độ Nâng cao) HẶC Tiêu đề + Badge đếm nhóm (Chế độ Cơ bản) */}
            <div className="flex items-center gap-2 min-w-0">
              {isAdvancedMode ? (
                <div className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-1.5 truncate">
                  <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{tBudget("totalBudget")}:</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(totalBudget, { currency: "VND" })}
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

            {/* Vế Phải: Cụm nút hành động */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
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
                  {tBudget("manageBudget")}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Members List */}
        {sortedParticipants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
            {t("noMembers")}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {sortedParticipants.map((p) => {
              const isMe = isCurrentParticipant(p.id);
              const pGroups = groups.filter(g => g.members.some(m => m.participantId === p.id));
              
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    isMe 
                      ? "bg-emerald-50/60 border-emerald-300/80 shadow-sm ring-1 ring-emerald-500/10" 
                      : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                    isMe 
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isMe ? <User size={20} /> : p.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                          {p.name}
                        </p>
                        {isMe && (
                          <Badge className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0">
                            {t("youLabel")}
                          </Badge>
                        )}
                      </div>

                      {isAdvancedMode && (
                        <div className="shrink-0">
                          {editingParticipantId === p.id ? (
                            <Input
                              autoFocus
                              type="number"
                              className="w-24 h-7 text-base sm:text-sm py-0 text-right bg-white rounded-lg border-emerald-400 focus-visible:ring-emerald-500"
                              value={inlineBudgetStr}
                              onChange={(e) => setInlineBudgetStr(e.target.value)}
                              onBlur={() => saveInlineEdit(p)}
                              onKeyDown={(e) => e.key === "Enter" && saveInlineEdit(p)}
                            />
                          ) : (
                            <span 
                              className="text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-100/60 hover:bg-emerald-100 px-2.5 py-1 rounded-lg cursor-pointer transition-colors" 
                              onClick={() => startInlineEdit(p)}
                            >
                              {formatCurrency(p.budget || 0, { currency: "VND" })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {pGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {pGroups.map((g, idx) => {
                          const colorVariants = ["bg-slate-100 text-slate-700", "bg-indigo-50 text-indigo-700", "bg-amber-50 text-amber-700"];
                          return (
                            <Badge
                              key={g.id}
                              onClick={() => handleEditGroup(g)}
                              className={`cursor-pointer transition-opacity border-transparent text-[10px] font-medium px-2 py-0.5 rounded-md ${colorVariants[idx % colorVariants.length]}`}
                            >
                              🏷️ {g.name} ({g.members.length})
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    
                    {isMe && p.paymentInfo?.accountNumber && (
                      <p className="text-[11px] text-emerald-800/80 truncate mt-1 font-medium flex items-center gap-1">
                        <span>🏦</span> {p.paymentInfo.accountNumber} ({p.paymentInfo.accountName || p.paymentInfo.bankBIN})
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFamilyConfigParticipantId(p.id)}
                      className={`h-9 rounded-full px-2.5 transition-all ${p.weight && p.weight > 1 ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                      title={t("familyConfigTitle")}
                    >
                      <Users className="w-4 h-4" />
                      {p.weight && p.weight > 1 && (
                        <span className="ml-1.5 text-xs font-bold">x{p.weight}</span>
                      )}
                    </Button>

                    {isMe && (
                      <Dialog open={openDialogId === p.id} onOpenChange={(open) => setOpenDialogId(open ? p.id : null)}>
                        <DialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 w-9 h-9 rounded-full bg-white sm:bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-500 active:scale-95 transition-all border border-slate-200/60"
                              title={t("setupPayment")}
                            />
                          }
                        >
                          <Settings2 className="w-4 h-4" />
                          <span className="sr-only">{t("setupPayment")}</span>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-900 text-center">{tPayment("dialogTitle")}</DialogTitle>
                          </DialogHeader>
                          <PaymentInfoForm eventId={eventId} currentPaymentInfo={p.paymentInfo ?? null} onSuccess={() => setOpenDialogId(null)} />
                        </DialogContent>
                      </Dialog>
                    )}

                    {isCreator && !isMe && p.name !== "🏢 Quỹ Công ty" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 w-9 h-9 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all"
                        title={t("deleteMemberTitle")}
                        onClick={() => {
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
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* FOOTER NEO CỐ ĐỊNH Ở ĐÁY MÀN HÌNH (Sticky Bottom Floating Bar) */}
      <div className="sticky bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent pt-6 pb-3 sm:pb-4 px-3 sm:px-6 pointer-events-none shrink-0">
        <div className="pointer-events-auto max-w-2xl mx-auto w-full flex flex-col items-center">
          
          {error && (
            <div className="mb-2 bg-rose-50 text-rose-600 text-xs font-semibold px-3 py-1 rounded-full border border-rose-100 shadow-sm animate-in slide-in-from-bottom-2">
              {error}
            </div>
          )}
          
          {/* Thanh Input hợp nhất co giãn linh hoạt */}
          <div className="relative flex items-center bg-white rounded-full shadow-md shadow-slate-200/60 border border-slate-200/80 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-1 sm:p-1.5 w-full">
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
              className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm active:scale-95 transition-all shrink-0 ml-1.5 whitespace-nowrap"
            >
              <span>{t("addButton")}</span>
            </Button>
          </div>
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

      <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">{tBudget("manageBudget")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                placeholder={tBudget("totalBudget")} 
                value={totalInput} 
                onChange={(e) => setTotalInput(e.target.value)} 
                // Thêm text-base sm:text-sm vào cuối class
                className="flex-1 rounded-xl h-10 border-slate-200 focus-visible:ring-emerald-500 text-base sm:text-sm" 
              />
              <Button variant="outline" onClick={handleSplitEvenly} className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 h-10">{tBudget("splitEvenly")}</Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 border-t border-slate-100 pt-3 mt-2">
              {realParticipants.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-1">
                  <span className="font-medium text-sm truncate flex-1 text-slate-800">{p.name}</span>
                  <Input 
                    type="number" 
                    value={draftBudgets[p.id] || 0} 
                    onChange={(e) => setDraftBudgets(prev => ({...prev, [p.id]: parseInt(e.target.value) || 0}))} 
                    // Thêm text-base sm:text-sm vào cuối class
                    className="w-32 text-right rounded-lg h-9 border-slate-200 focus-visible:ring-emerald-500 text-base sm:text-sm" 
                  />
                </div>
              ))}
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 border-t border-slate-100 pt-3 mt-2">
              {realParticipants.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-1">
                  <span className="font-medium text-sm truncate flex-1 text-slate-800">{p.name}</span>
                  <Input type="number" value={draftBudgets[p.id] || 0} onChange={(e) => setDraftBudgets(prev => ({...prev, [p.id]: parseInt(e.target.value) || 0}))} className="w-32 text-right rounded-lg h-9 border-slate-200 focus-visible:ring-emerald-500" />
                </div>
              ))}
            </div>
            <Button onClick={handleSaveBudgetModal} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 font-medium">{tCommon("save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}