"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useSession } from "next-auth/react";
import { AdminUserItem, adminVerifyUserEmail, updateUserRole, adminDeleteUser } from "@/actions/admin/user";
import { startImpersonation } from "@/actions/admin/impersonate";
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
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { MoreHorizontal, CheckCircle, ShieldCheck, ShieldAlert, Trash2, Loader2, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserActionsDropdownProps {
  user: AdminUserItem;
  currentUserId?: string;
}

export function UserActionsDropdown({ user, currentUserId }: UserActionsDropdownProps) {
  const t = useTranslations("adminUsers");
  const router = useRouter();
  const { update } = useSession();
  const { showAlert } = useAlert();
  const [isPending, startTransition] = useTransition();

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);

  const isSelf = currentUserId === user.id;
  const isEmailVerified = !!user.emailVerified;
  const targetRole = user.role === "ADMIN" ? "USER" : "ADMIN";
  const targetRoleLabel = targetRole === "ADMIN" ? t("role_admin") : t("role_user");
  const displayName = user.name || user.email || t("anonymous_user");

  const handleVerifyEmail = () => {
    startTransition(async () => {
      const res = await adminVerifyUserEmail(user.id);
      setVerifyOpen(false);
      if (res.success) {
        showAlert({
          type: "success",
          title: t("success_verify_email"),
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

  const handleChangeRole = () => {
    startTransition(async () => {
      const res = await updateUserRole(user.id, targetRole);
      setRoleOpen(false);
      if (res.success) {
        showAlert({
          type: "success",
          title: t("success_change_role"),
        });
      } else {
        showAlert({
          type: "error",
          title: t("system_error"),
          message: res.error === "CANNOT_CHANGE_OWN_ROLE" ? t("cannot_change_own_role") : res.error,
        });
      }
    });
  };

  const handleDeleteUser = () => {
    startTransition(async () => {
      const res = await adminDeleteUser(user.id);
      setDeleteOpen(false);
      if (res.success) {
        showAlert({
          type: "success",
          title: t("success_delete_user"),
        });
      } else {
        showAlert({
          type: "error",
          title: t("system_error"),
          message: res.error === "CANNOT_DELETE_SELF" ? t("cannot_delete_self") : res.error,
        });
      }
    });
  };

  const handleImpersonate = () => {
    startTransition(async () => {
      const res = await startImpersonation(user.id);
      setImpersonateOpen(false);
      if (res.success) {
        await update();
        router.push("/");
        router.refresh();
      } else {
        const errorKey = res.error as any;
        const msg =
          errorKey === "user_not_found" || errorKey === "cannot_impersonate_admin"
            ? t(errorKey)
            : res.error;
        showAlert({
          type: "error",
          title: t("system_error"),
          message: msg,
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
          className="w-56 p-1.5 rounded-2xl shadow-lg border-slate-200 bg-white"
        >
          {/* 1. Đăng nhập hỗ trợ (Impersonation) - chỉ hiện khi không phải ADMIN */}
          {user.role !== "ADMIN" && (
            <DropdownMenuItem
              className="cursor-pointer px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 focus:bg-amber-50 transition-colors"
              onClick={() => setImpersonateOpen(true)}
            >
              <Headphones className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t("impersonate_user")}</span>
            </DropdownMenuItem>
          )}

          {/* 2. Xác thực email thủ công (chỉ hiện khi chưa xác thực) */}
          {!isEmailVerified && (
            <DropdownMenuItem
              className="cursor-pointer px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 focus:bg-emerald-50 transition-colors"
              onClick={() => setVerifyOpen(true)}
            >
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t("manual_verify_email")}</span>
            </DropdownMenuItem>
          )}

          {/* 3. Đổi quyền USER <-> ADMIN */}
          <DropdownMenuItem
            disabled={isSelf}
            className={cn(
              "cursor-pointer px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:bg-slate-50 transition-colors",
              isSelf && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !isSelf && setRoleOpen(true)}
          >
            {user.role === "ADMIN" ? (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <span>
              {user.role === "ADMIN" ? t("change_to_user") : t("change_to_admin")}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />

          {/* 4. Xóa tài khoản */}
          <DropdownMenuItem
            disabled={isSelf}
            className={cn(
              "cursor-pointer px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 focus:bg-rose-50 transition-colors",
              isSelf && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !isSelf && setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{t("delete_user")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* AlertDialog: Xác thực email thủ công */}
      <AlertDialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm_verify_email_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_verify_email_desc", { email: displayName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              disabled={isPending}
              onClick={handleVerifyEmail}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Đổi quyền vai trò */}
      <AlertDialog open={roleOpen} onOpenChange={setRoleOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm_change_role_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_change_role_desc", {
                email: displayName,
                role: targetRoleLabel,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              disabled={isPending}
              onClick={handleChangeRole}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Xóa tài khoản */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600">
              {t("confirm_delete_user_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_delete_user_desc", { email: displayName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              disabled={isPending}
              variant="destructive"
              onClick={handleDeleteUser}
              className="rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Đăng nhập hỗ trợ (Impersonation) */}
      <AlertDialog open={impersonateOpen} onOpenChange={setImpersonateOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Headphones className="w-5 h-5 shrink-0 text-amber-600" />
              <span>{t("confirm_impersonate_title")}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 leading-relaxed">
              {t("confirm_impersonate_desc", { name: displayName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              disabled={isPending}
              onClick={handleImpersonate}
              className="rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
