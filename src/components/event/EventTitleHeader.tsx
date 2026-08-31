"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, X, Loader2, Lock } from "lucide-react";
import { updateEventTitle } from "@/actions/event";
import { useAlert } from "@/providers/AlertProvider";

type Props = {
  eventId: string;
  initialTitle: string;
  isCreator: boolean;
  isLocked?: boolean;
  memberCount: number;
};

export default function EventTitleHeader({
  eventId,
  initialTitle,
  isCreator,
  isLocked = false,
  memberCount,
}: Props) {
  const t = useTranslations("event");
  const tCommon = useTranslations("common");
  const { showAlert } = useAlert();

  const [title, setTitle] = useState(initialTitle);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(initialTitle);
    setDraftTitle(initialTitle);
  }, [initialTitle]);

  const handleStartEdit = () => {
    setDraftTitle(title);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraftTitle(title);
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      showAlert({
        type: "error",
        title: tCommon("error") || "Lỗi",
        message: "Tên sự kiện không được để trống",
      });
      return;
    }

    if (trimmed === title) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      const res = await updateEventTitle({
        eventId,
        title: trimmed,
      });

      if (!res.success) {
        showAlert({
          type: "error",
          title: tCommon("error") || "Lỗi",
          message: res.error || "Không thể cập nhật tên sự kiện",
        });
      } else {
        setTitle(trimmed);
        setIsEditing(false);
      }
    });
  };

  const titleLength = title.length;
  let titleSizeClass = "text-xl sm:text-2xl";
  if (titleLength > 30 && titleLength <= 60) {
    titleSizeClass = "text-lg sm:text-xl";
  } else if (titleLength > 60) {
    titleSizeClass = "text-base sm:text-lg";
  }

  return (
    <div className="px-4 py-3.5 sm:px-6 border-b border-slate-100 bg-white shrink-0">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            type="text"
            className="h-10 text-base sm:text-lg font-bold text-slate-900 bg-white border-indigo-400 focus-visible:ring-indigo-500 rounded-xl flex-1 max-w-lg"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            disabled={isPending}
            placeholder="Nhập tên sự kiện..."
          />
          <Button
            size="icon"
            onClick={handleSave}
            disabled={isPending || !draftTitle.trim()}
            className="shrink-0 w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all shadow-sm"
            title="Lưu"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCancel}
            disabled={isPending}
            className="shrink-0 w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
            title="Hủy"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <h1 className={`font-extrabold text-slate-900 break-words leading-tight line-clamp-2 ${titleSizeClass}`}>
            {title}
          </h1>
          {isLocked && (
            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 px-2 py-0.5 text-xs font-semibold shrink-0 gap-1 rounded-full">
              <Lock className="w-3 h-3 text-rose-500 inline-block" />
              <span>{t("lockedBadge", { fallback: "Đã khóa" })}</span>
            </Badge>
          )}
          {isCreator && !isLocked && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 w-8 h-8 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all -ml-0.5"
              title="Đổi tên sự kiện"
              onClick={handleStartEdit}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
      <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
        {t("memberCount", { count: memberCount })}
      </p>
    </div>
  );
}
