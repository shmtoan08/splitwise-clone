"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { getUserContacts, ContactItem } from "@/actions/contact";
import { addParticipant } from "@/actions/participant";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Loader2, BookUser, Check, X } from "lucide-react";
import { useAlert } from "@/providers/AlertProvider";

interface ParticipantSummary {
  id: string;
  name: string;
  userId?: string | null;
}

interface ContactPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  existingParticipants: ParticipantSummary[];
  onSuccess?: (participantId: string) => void;
}

export default function ContactPickerModal({
  open,
  onOpenChange,
  eventId,
  existingParticipants,
  onSuccess,
}: ContactPickerModalProps) {
  const t = useTranslations("participant");
  const tCommon = useTranslations("common");
  const { showAlert } = useAlert();

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  // Load contacts khi modal mở
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getUserContacts()
        .then((data) => {
          if (Array.isArray(data)) {
            setContacts(data);
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setSearchQuery("");
      setAddingId(null);
    }
  }, [open]);

  // Bộ lọc tìm kiếm
  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [contacts, searchQuery]);

  // Kiểm tra liên hệ đã có trong nhóm chưa (khớp tên hoặc khớp userId)
  const isContactJoined = (contact: ContactItem) => {
    const contactNameLower = contact.name.trim().toLowerCase();
    return existingParticipants.some((p) => {
      const pNameLower = p.name.trim().toLowerCase();
      const matchName = pNameLower === contactNameLower;
      const matchUserId =
        contact.contactUserId && p.userId
          ? p.userId === contact.contactUserId
          : false;
      return matchName || matchUserId;
    });
  };

  const handleAdd = async (contact: ContactItem) => {
    if (addingId) return;
    setAddingId(contact.id);
    try {
      const result = await addParticipant({
        eventId,
        name: contact.name,
        userId: contact.contactUserId || undefined,
        isSelf: false,
      });

      if (!result.success) {
        showAlert({
          type: "error",
          title: tCommon("error") || "Lỗi",
          message: result.error || "Không thể thêm thành viên.",
        });
      } else {
        if (result.data?.participantId) {
          onSuccess?.(result.data.participantId);
        }
      }
    } catch (err) {
      console.error("[ContactPickerModal] Error adding participant:", err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl p-5 sm:p-6 bg-white">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookUser className="w-5 h-5 text-indigo-600" />
            <span>{t("contactPickerModalTitle", { fallback: "Chọn từ danh bạ" })}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Ô tìm kiếm nhanh */}
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("contactPickerSearchPlaceholder", {
              fallback: "Tìm tên hoặc email...",
            })}
            className="pl-9 pr-9 h-10 bg-slate-50 border-slate-200 rounded-xl text-sm focus-visible:ring-indigo-500/30"
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

        {/* Danh sách liên hệ */}
        <div className="mt-2 max-h-[360px] overflow-y-auto space-y-1.5 pr-1 -mr-1 scrollbar-thin">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span>{tCommon("loading") || "Đang tải..."}</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm gap-2 text-center px-4">
              <BookUser className="w-10 h-10 text-slate-300 stroke-[1.5]" />
              <p className="font-medium text-slate-600">
                {t("contactPickerNoContacts", {
                  fallback: "Danh bạ của bạn chưa có liên hệ nào.",
                })}
              </p>
              <p className="text-xs text-slate-400">
                {t("select_from_contacts", {
                  fallback: "Bạn có thể lưu thành viên vào danh bạ từ danh sách sự kiện.",
                })}
              </p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-sm">
              <p>{t("contactPickerEmpty", { fallback: "Không tìm thấy liên hệ nào" })}</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isJoined = isContactJoined(contact);
              const isAddingThis = addingId === contact.id;

              return (
                <div
                  key={contact.id}
                  className={`flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all ${
                    isJoined
                      ? "bg-slate-50/60 border-slate-200/60 opacity-80"
                      : "bg-white border-slate-200/80 hover:border-indigo-200 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isJoined
                          ? "bg-slate-200 text-slate-500"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {contact.name}
                      </p>
                      {contact.email && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {contact.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isJoined ? (
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-500 border-slate-200/60 text-xs font-normal px-2.5 py-1 rounded-lg"
                      >
                        <Check className="w-3 h-3 mr-1 text-emerald-600" />
                        <span>{t("alreadyJoined", { fallback: "Đã tham gia" })}</span>
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isAddingThis}
                        onClick={() => handleAdd(contact)}
                        className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 active:scale-95 transition-all shadow-xs"
                      >
                        {isAddingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                        )}
                        <span>{t("add", { fallback: "Thêm" })}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
