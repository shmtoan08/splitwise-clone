"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AdminUserItem, adminBulkVerifyEmails, adminBulkDeleteUsers } from "@/actions/admin/user";
import { useAlert } from "@/providers/AlertProvider";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserActionsDropdown } from "@/components/admin/UserActionsDropdown";
import { FloatingActionBar } from "@/components/admin/FloatingActionBar";
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
  ShieldCheck,
  Shield,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  Trash2,
  Loader2,
  Inbox,
  Calendar,
} from "lucide-react";

interface UsersTableClientProps {
  users: AdminUserItem[];
  currentUserId?: string;
  locale: string;
}

export function UsersTableClient({
  users,
  currentUserId,
  locale,
}: UsersTableClientProps) {
  const t = useTranslations("adminUsers");
  const { showAlert } = useAlert();
  const [isPending, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

  const isAllSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const handleToggleSelectRow = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleBulkVerifyEmail = () => {
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      const res = await adminBulkVerifyEmails(ids);
      if (res.success) {
        setSelectedIds(new Set());
        showAlert({
          type: "success",
          title: t("success_bulk_verify", { count: res.count ?? ids.length }),
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

  const handleBulkDelete = () => {
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      const res = await adminBulkDeleteUsers(ids);
      setBulkDeleteOpen(false);
      if (res.success) {
        setSelectedIds(new Set());
        showAlert({
          type: "success",
          title: t("success_bulk_delete", { count: res.count ?? ids.length }),
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

  if (users.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400 gap-2.5">
        <Inbox className="w-10 h-10 stroke-1 text-slate-300" />
        <p className="text-sm font-medium">{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View (< md): Danh sách dạng Card tối ưu hóa cho màn hình điện thoại */}
      <div className="md:hidden">
        {/* Mobile Header: Checkbox chọn tất cả & Đếm số lượng */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2.5">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleToggleSelectAll}
              aria-label="Select all"
              className="cursor-pointer"
            />
            <span className="font-semibold text-slate-700">
              {t("select_all")}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {users.length} {t("colUser").toLowerCase()}
          </span>
        </div>

        {/* Mobile Users List */}
        <div className="divide-y divide-slate-100">
          {users.map((user) => {
            const isSelected = selectedIds.has(user.id);
            const avatarLetter = (user.name || user.email || "U").charAt(0).toUpperCase();

            return (
              <div
                key={user.id}
                className={`p-4 flex flex-col gap-3 transition-colors ${
                  isSelected ? "bg-emerald-50/40 hover:bg-emerald-50/60" : "hover:bg-slate-50/60"
                }`}
              >
                {/* Hàng 1: Checkbox + Avatar + Tên & Email + Dropdown Thao tác */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="pt-1 shrink-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelectRow(user.id)}
                        aria-label={`Select ${user.name || user.email}`}
                        className="cursor-pointer"
                      />
                    </div>

                    <Avatar className="w-9 h-9 border border-slate-200 shrink-0">
                      {user.image && <AvatarImage src={user.image} alt={user.name || "Avatar"} />}
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xs">
                        {avatarLetter}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 flex flex-col">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {user.name || t("anonymous_user")}
                      </span>
                      <span className="text-xs text-slate-500 truncate">
                        {user.email || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Menu Thao tác (3 chấm) */}
                  <div className="shrink-0">
                    <UserActionsDropdown
                      user={user}
                      currentUserId={currentUserId}
                    />
                  </div>
                </div>

                {/* Hàng 2: Badges (Vai trò + Trạng thái xác thực Email) */}
                <div className="flex items-center gap-1.5 flex-wrap pl-7">
                  {/* Vai trò */}
                  {user.role === "ADMIN" ? (
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border border-purple-200 gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 shadow-none shrink-0">
                      <ShieldCheck className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                      <span>{t("role_admin")}</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-slate-100 text-slate-600 border-slate-200 gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0"
                    >
                      <Shield className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span>{t("role_user")}</span>
                    </Badge>
                  )}

                  {/* Trạng thái xác thực Email */}
                  {user.emailVerified ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold text-[10px] rounded-full px-2 py-0.5 shrink-0"
                    >
                      <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      <span>{t("email_verified")}</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-semibold text-[10px] rounded-full px-2 py-0.5 shrink-0"
                    >
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      <span>{t("email_unverified")}</span>
                    </Badge>
                  )}
                </div>

                {/* Hàng 3: Metadata (Số nhóm & Ngày đăng ký) */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80 pl-7">
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {t("events_count", {
                        count: user._count.participants,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop View (>= md): Bảng dữ liệu Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-slate-100">
              {/* Checkbox tổng */}
              <TableHead className="w-12 pl-4 sm:pl-6">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleToggleSelectAll}
                  aria-label="Select all"
                  className="cursor-pointer"
                />
              </TableHead>
              <TableHead className="w-[30%] min-w-[200px] text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("colUser")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("colEmailStatus")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("colRole")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("colEventsCount")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("colCreatedAt")}
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 pr-5 sm:pr-6">
                {t("colActions")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.map((user) => {
              const isSelected = selectedIds.has(user.id);
              const avatarLetter = (user.name || user.email || "U").charAt(0).toUpperCase();

              return (
                <TableRow
                  key={user.id}
                  className={`hover:bg-slate-50/80 transition-colors border-slate-100 ${
                    isSelected ? "bg-emerald-50/40 hover:bg-emerald-50/60" : ""
                  }`}
                >
                  {/* Cột Checkbox */}
                  <TableCell className="pl-4 sm:pl-6 py-3.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleSelectRow(user.id)}
                      aria-label={`Select ${user.name || user.email}`}
                      className="cursor-pointer"
                    />
                  </TableCell>

                  {/* Cột 1: Người dùng */}
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9 border border-slate-200">
                        {user.image && <AvatarImage src={user.image} alt={user.name || "Avatar"} />}
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xs">
                          {avatarLetter}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex flex-col">
                        <span className="font-semibold text-sm text-slate-900 truncate">
                          {user.name || t("anonymous_user")}
                        </span>
                        <span className="text-xs text-slate-500 truncate">
                          {user.email || "—"}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Cột 2: Trạng thái Email */}
                  <TableCell className="py-3.5">
                    {user.emailVerified ? (
                      <div className="flex flex-col gap-0.5 items-start">
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold text-[11px] rounded-full px-2.5 py-0.5"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{t("email_verified")}</span>
                        </Badge>
                        <span className="text-[10px] text-slate-400 pl-1 font-mono">
                          {formatDate(user.emailVerified)}
                        </span>
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-semibold text-[11px] rounded-full px-2.5 py-0.5"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{t("email_unverified")}</span>
                      </Badge>
                    )}
                  </TableCell>

                  {/* Cột 3: Vai trò */}
                  <TableCell className="py-3.5">
                    {user.role === "ADMIN" ? (
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border border-purple-200 gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 shadow-none">
                        <ShieldCheck className="w-3 h-3 text-purple-600 shrink-0" />
                        <span>{t("role_admin")}</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-slate-100 text-slate-600 border-slate-200 gap-1 text-[11px] font-medium rounded-full px-2.5 py-0.5"
                      >
                        <Shield className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{t("role_user")}</span>
                      </Badge>
                    )}
                  </TableCell>

                  {/* Cột 4: Số nhóm */}
                  <TableCell className="py-3.5 text-slate-600 text-sm">
                    <div className="flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {t("events_count", {
                          count: user._count.participants,
                        })}
                      </span>
                    </div>
                  </TableCell>

                  {/* Cột 5: Ngày tham gia */}
                  <TableCell className="py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(user.createdAt)}
                  </TableCell>

                  {/* Cột 6: Thao tác đơn lẻ */}
                  <TableCell className="text-right pr-5 sm:pr-6 py-3.5">
                    <UserActionsDropdown
                      user={user}
                      currentUserId={currentUserId}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Floating Action Bar khi có item được chọn */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        label={t("bulk_selected", { count: selectedIds.size })}
        clearLabel={t("clear_selection")}
        onClear={() => setSelectedIds(new Set())}
      >
        {/* Nút 1: Xác thực email hàng loạt */}
        <Button
          size="sm"
          onClick={handleBulkVerifyEmail}
          disabled={isPending}
          className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{t("bulk_verify_email")}</span>
        </Button>

        {/* Nút 2: Xóa người dùng hàng loạt */}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setBulkDeleteOpen(true)}
          disabled={isPending}
          className="rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-8 px-3 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("bulk_delete")}</span>
        </Button>
      </FloatingActionBar>

      {/* Modal xác nhận xóa hàng loạt */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="rounded-2xl border-rose-100">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <AlertDialogTitle className="text-rose-600">
                {t("confirm_bulk_delete_title", { count: selectedIds.size })}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600 leading-relaxed">
              {t("confirm_bulk_delete_desc", { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              disabled={isPending}
              variant="destructive"
              onClick={handleBulkDelete}
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
