"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Users,
  Calendar,
  X,
  Inbox,
  RotateCcw,
  MonitorSmartphone,
  WifiOff,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  getAdminEventMembers,
  AdminEventMemberItem,
} from "@/actions/admin/event";
import { resetParticipantIdentity } from "@/actions/participant";
import { useAlert } from "@/providers/AlertProvider";

interface EventMembersSheetProps {
  eventId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventMembersSheet({
  eventId,
  isOpen,
  onClose,
}: EventMembersSheetProps) {
  const t = useTranslations("adminEvents");
  const locale = useLocale();
  const { showAlert } = useAlert();

  const [isPending, startTransition] = useTransition();
  const [members, setMembers] = useState<AdminEventMemberItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    try {
      return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleDateString();
    }
  };

  const fetchMembers = useCallback(() => {
    if (!eventId) return;
    
    startTransition(async () => {
      try {
        const res = await getAdminEventMembers(eventId);
        if (res.success && res.data) {
          setMembers(res.data);
          setError(null);
        } else {
          setError(res.error || "Lỗi tải dữ liệu");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "SYSTEM_ERROR");
      }
    });
  }, [eventId]);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchMembers();
    }
  }, [isOpen, eventId, fetchMembers]);

  const handleResetDevice = (participantId: string) => {
    if (!eventId) return;

    showAlert({
      title: t("reset_device"),
      message: t("reset_device_confirm"),
      type: "warning",
      confirmText: t("confirm"),
      onConfirm: () => {
        startTransition(async () => {
          try {
            const res = await resetParticipantIdentity(eventId, participantId);
            if (res.success) {
              // Re-fetch after success
              fetchMembers();
            } else {
              showAlert({
                type: "error",
                title: t("system_error"),
                message: res.error,
              });
            }
          } catch (err) {
            showAlert({
              type: "error",
              title: t("system_error"),
              message: err instanceof Error ? err.message : "SYSTEM_ERROR",
            });
          }
        });
      },
    });
  };

  return (
    <Sheet
      side="right"
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent className="w-full max-w-full sm:max-w-lg data-[swipe-axis=x]:[--drawer-content-width:100%] data-[swipe-axis=x]:sm:[--drawer-content-width:32rem] p-4 sm:p-6 bg-white flex flex-col h-full">
        <SheetHeader className="pb-3 border-b border-slate-100 text-left shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base font-bold text-slate-900 truncate">
                  {t("members_sheet_title")}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 truncate mt-0.5">
                  {t("members_sheet_desc")}
                </SheetDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pt-3 pr-0.5">
          {isPending && members.length === 0 ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mt-10" />
          ) : error ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm font-medium text-rose-500">{t("system_error")}</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Inbox className="w-9 h-9 stroke-1 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                {t("empty_members")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-slate-100 rounded-lg flex items-center justify-between gap-3 bg-slate-50/50"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm uppercase">
                        {item.name.charAt(0) || "?"}
                      </div>
                    </div>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-sm text-slate-900 truncate block">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {item.isCreator ? (
                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-transparent text-[10px] px-1.5 py-0 shadow-none font-medium shrink-0">
                            {t("role_creator")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-200 text-[10px] px-1.5 py-0 shadow-none font-medium shrink-0">
                            {t("role_member")}
                          </Badge>
                        )}
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.joinedAt)}
                        </span>
                      </div>

                      {/* Auth User Info */}
                      {item.user ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/70 border border-blue-100 rounded-md px-2 py-1 mt-1.5 min-w-0">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0"/>
                          <span className="font-semibold truncate">
                            {item.user.name || t("unnamed_user")}
                          </span>
                          {item.user.email && (
                            <span className="text-blue-500 font-mono text-[10px] truncate">
                              ({item.user.email})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1.5">
                          <UserX className="w-3 h-3 shrink-0"/>
                          <span>{t("guest_user")}</span>
                        </div>
                      )}

                      {/* Device Info */}
                      {item.hasDevice ? (
                        <div 
                          className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 mt-2 flex items-center justify-between gap-2"
                          title={item.deviceToken || undefined}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MonitorSmartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap shrink-0">
                              {t("device_info_label")}:
                            </span>
                            {/* Hiển thị deviceInfo nếu có; nếu là token thì hiển thị tràn tự nhiên theo độ rộng khung */}
                            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded truncate select-all">
                              {item.deviceInfo || item.deviceToken}
                            </span>
                          </div>

                          {/* Nút copy nhanh mã ID nếu hiển thị dạng token */}
                          {item.deviceToken && !item.deviceInfo && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(item.deviceToken!);
                                showAlert({
                                  type: "success",
                                  title: t("copied", { fallback: "Đã sao chép" }),
                                  message: item.deviceToken!,
                                });
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-700 shrink-0 px-1.5 py-0.5 rounded hover:bg-slate-200/50 transition-colors"
                              title="Copy ID"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 font-medium">
                          <WifiOff className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("not_linked")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.hasDevice && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetDevice(item.id)}
                      disabled={isPending}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 shrink-0 cursor-pointer"
                      title={t("reset_device")}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
