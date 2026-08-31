"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteEvent } from "@/actions/event";
import { useRecentEvents } from "@/hooks/useRecentEvents";
import { Trash2, Loader2 } from "lucide-react";

type Props = {
  eventId: string;
  eventTitle: string;
  isCreator: boolean;
};

export default function DeleteEventButton({ eventId, eventTitle, isCreator }: Props) {
  const t = useTranslations("event");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { removeRecentEvent } = useRecentEvents();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCreator) return null;

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    const res = await deleteEvent(eventId);

    if (!res.success) {
      setIsLoading(false);
      if (res.error === "unauthorized") {
        setError(tCommon("unauthorized") || "Bạn không có quyền xóa sự kiện này.");
      } else {
        setError(res.error || tCommon("errorSystem") || "Đã xảy ra lỗi khi xóa sự kiện.");
      }
      return;
    }

    // Xóa khỏi danh sách recent events trong local storage
    removeRecentEvent(eventId);

    // Chuyển hướng về trang chủ
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-8 w-8 rounded-full text-rose-500 hover:text-rose-700 hover:bg-rose-50 active:scale-95 transition-all"
        title={t("deleteEventTitle")}
      >
        <Trash2 className="w-4 h-4 text-rose-500" />
        <span className="sr-only">{t("deleteEventTitle")}</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[420px] w-[95vw] rounded-3xl p-6">
          <DialogHeader className="flex flex-col items-center gap-2 pt-2">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-1">
              <Trash2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900 text-center">
              {t("deleteEventConfirmTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-2 space-y-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
              <p className="font-bold text-slate-800 text-sm truncate">{eventTitle}</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t("deleteEventConfirmDesc")}
            </p>
            {error && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="flex flex-row gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="flex-1 h-11 rounded-full border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
            >
              {tCommon("cancel") || "Hủy"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex-1 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("deleteEventButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
