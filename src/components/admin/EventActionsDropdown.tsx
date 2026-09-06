"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AdminEventItem, adminToggleLockEvent, adminDeleteEvent } from "@/actions/admin/event";
import { useAlert } from "@/providers/AlertProvider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  ExternalLink,
  Lock,
  Unlock,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface EventActionsDropdownProps {
  event: AdminEventItem;
}

export function EventActionsDropdown({ event }: EventActionsDropdownProps) {
  const t = useTranslations("adminEvents");
  const { showAlert } = useAlert();
  const [isPending, startTransition] = useTransition();

  const [lockOpen, setLockOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleToggleLock = () => {
    startTransition(async () => {
      const nextLocked = !event.isLocked;
      const res = await adminToggleLockEvent(event.id, nextLocked);
      setLockOpen(false);
      if (res.success) {
        showAlert({
          type: "success",
          title: nextLocked ? t("success_lock") : t("success_unlock"),
        });
      } else {
        showAlert({
          type: "error",
          title: t("system_error"),
          message: res.error,
        });
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await adminDeleteEvent(event.id);
      setDeleteOpen(false);
      if (res.success) {
        showAlert({
          type: "success",
          title: t("success_delete"),
        });
      } else {
        showAlert({
          type: "error",
          title: t("system_error"),
          message: res.error,
        });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              disabled={isPending}
              className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              aria-label={t("actions_menu")}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <MoreHorizontal className="w-4 h-4" />
              )}
            </Button>
          }
        />

        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-52 p-1.5 rounded-2xl shadow-lg border-slate-200 bg-white"
        >
          {/* 1. Xem sự kiện */}
          <DropdownMenuItem
            className="cursor-pointer px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:bg-slate-50 transition-colors"
            onClick={() => {
              window.open(`/e/${event.id}?from=admin`, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{t("action_view_event")}</span>
          </DropdownMenuItem>

          {/* 2. Khóa / Mở khóa sổ */}
          <DropdownMenuItem
            className="cursor-pointer px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:bg-slate-50 transition-colors"
            onClick={() => setLockOpen(true)}
          >
            {event.isLocked ? (
              <>
                <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-700 font-semibold">{t("action_unlock_event")}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-amber-700 font-semibold">{t("action_lock_event")}</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          {/* 3. Xóa vĩnh viễn */}
          <DropdownMenuItem
            className="cursor-pointer px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 focus:bg-rose-50 transition-colors"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{t("action_delete_event")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* AlertDialog: Khóa / Mở khóa sổ */}
      <AlertDialog open={lockOpen} onOpenChange={setLockOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {event.isLocked ? t("confirm_unlock_title") : t("confirm_lock_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {event.isLocked ? t("confirm_unlock_desc") : t("confirm_lock_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              disabled={isPending}
              onClick={handleToggleLock}
              className={
                event.isLocked
                  ? "rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  : "rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              }
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("confirm")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Xóa vĩnh viễn sự kiện */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl border-rose-100">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <AlertDialogTitle className="text-rose-600">
                {t("confirm_delete_title")}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600 leading-relaxed">
              {t("confirm_delete_desc", { title: event.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              disabled={isPending}
              variant="destructive"
              onClick={handleDelete}
              className="rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
