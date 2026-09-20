"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
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
  FolderOpen,
  ExternalLink,
  Lock,
  Calendar,
  X,
  Inbox,
} from "lucide-react";
import {
  getAdminUserEvents,
  AdminUserEventItem,
} from "@/actions/admin/user";

interface UserEventsSheetProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserEventsSheet({
  userId,
  isOpen,
  onClose,
}: UserEventsSheetProps) {
  const t = useTranslations("adminUsers");
  const locale = useLocale();

  const [isPending, startTransition] = useTransition();
  const [events, setEvents] = useState<AdminUserEventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    try {
      return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleDateString();
    }
  };

  useEffect(() => {
    if (!isOpen || !userId) {
      return;
    }

    let isMounted = true;

    startTransition(async () => {
      try {
        const res = await getAdminUserEvents(userId);
        if (!isMounted) return;
        if (res.success) {
          setEvents(res.data);
          setError(null);
        } else {
          setError(res.error);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "SYSTEM_ERROR");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);


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
      <SheetContent className="w-full max-w-full sm:max-w-md data-[swipe-axis=x]:[--drawer-content-width:100%] data-[swipe-axis=x]:sm:[--drawer-content-width:28rem] p-4 sm:p-6 bg-white flex flex-col h-full">
        <SheetHeader className="pb-3 border-b border-slate-100 text-left shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base font-bold text-slate-900 truncate">
                  {t("events_sheet_title")}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 truncate mt-0.5">
                  {t("events_sheet_desc")}
                </SheetDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0 cursor-pointer"
              aria-label={t("events_sheet_close")}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Nội dung danh sách sự kiện */}
        <div className="flex-1 overflow-y-auto min-h-0 pt-3 pr-0.5">
          {isPending ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mt-10" />
          ) : error ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm font-medium text-rose-500">{t("system_error")}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Inbox className="w-9 h-9 stroke-1 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                {t("events_sheet_empty")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((item) => (
                <Link
                  key={item.eventId}
                  href={`/e/${item.eventId}`}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="block p-3 hover:bg-slate-50 border rounded-lg mb-2 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 line-clamp-1">
                          {item.title}
                        </span>
                        {item.isLocked && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 shrink-0 font-medium"
                          >
                            <Lock className="w-2.5 h-2.5 mr-0.5 inline-block" />
                            {t("event_locked")}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 block truncate mt-1">
                        {t("participant_as", { name: item.participantName })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {item.isCreator ? (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[10px] font-semibold rounded-full px-2 py-0.5 shadow-none shrink-0">
                          {t("role_creator")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0"
                        >
                          {t("role_member")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      {t("joined_at", { date: formatDate(item.joinedAt) })}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
