"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AdminEventItem, adminBulkDeleteEvents, adminBulkToggleLockEvents } from "@/actions/admin/event";
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
import { EventActionsDropdown } from "@/components/admin/EventActionsDropdown";
import { EventIdBadge } from "@/components/admin/EventIdBadge";
import { FloatingActionBar } from "@/components/admin/FloatingActionBar";
import { EventMembersSheet } from "@/components/admin/EventMembersSheet";
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
  Users,
  Receipt,
  Lock,
  Unlock,
  CheckCircle,
  Layers,
  Trash2,
  Loader2,
  AlertTriangle,
  Inbox,
  Calendar,
} from "lucide-react";

interface EventsTableClientProps {
  events: AdminEventItem[];
  locale: string;
}

export function EventsTableClient({ events, locale }: EventsTableClientProps) {
  const t = useTranslations("adminEvents");
  const { showAlert } = useAlert();
  const [isPending, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedEventIdForMembers, setSelectedEventIdForMembers] = useState<string | null>(null);

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

  const isAllSelected = events.length > 0 && events.every((e) => selectedIds.has(e.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map((e) => e.id)));
    }
  };

  const handleToggleSelectRow = (eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleBulkToggleLock = (isLocked: boolean) => {
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      const res = await adminBulkToggleLockEvents(ids, isLocked);
      if (res.success) {
        setSelectedIds(new Set());
        showAlert({
          type: "success",
          title: isLocked
            ? t("success_bulk_lock", { count: res.count ?? ids.length })
            : t("success_bulk_unlock", { count: res.count ?? ids.length }),
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
      const res = await adminBulkDeleteEvents(ids);
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
          message: res.error,
        });
      }
    });
  };

  if (events.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400 gap-2.5">
        <Inbox className="w-10 h-10 stroke-1 text-slate-300" />
        <p className="text-sm font-medium">{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View (< md): Danh sách dạng Card tối ưu cho màn hình điện thoại */}
      <div className="md:hidden">
        {/* Mobile Header: Checkbox chọn tất cả & Số lượng sự kiện */}
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
            {events.length} {t("title").toLowerCase()}
          </span>
        </div>

        {/* Mobile Events List */}
        <div className="divide-y divide-slate-100">
          {events.map((event) => {
            const isSelected = selectedIds.has(event.id);

            return (
              <div
                key={event.id}
                className={`p-4 flex flex-col gap-3 transition-colors ${
                  isSelected ? "bg-emerald-50/40 hover:bg-emerald-50/60" : "hover:bg-slate-50/60"
                }`}
              >
                {/* Hàng 1: Checkbox + Tên & UUID + Dropdown Thao tác */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="pt-0.5 shrink-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelectRow(event.id)}
                        aria-label={`Select ${event.title}`}
                        className="cursor-pointer"
                      />
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <span className="font-semibold text-sm text-slate-900 line-clamp-1 break-all">
                        {event.title}
                      </span>
                      <div>
                        <EventIdBadge id={event.id} />
                      </div>
                    </div>
                  </div>

                  {/* Menu Thao tác (3 chấm) */}
                  <div className="shrink-0">
                    <EventActionsDropdown event={event} />
                  </div>
                </div>

                {/* Hàng 2: Badges (Trạng thái + Chế độ + Tiền tệ) */}
                <div className="flex items-center gap-1.5 flex-wrap pl-7">
                  {/* Trạng thái */}
                  {event.isLocked ? (
                    <Badge
                      variant="outline"
                      className="bg-rose-50 text-rose-700 border-rose-200 gap-1 font-semibold text-[10px] rounded-full px-2 py-0.5 shrink-0"
                    >
                      <Lock className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                      <span>{t("status_badge_locked")}</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold text-[10px] rounded-full px-2 py-0.5 shrink-0"
                    >
                      <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      <span>{t("status_badge_active")}</span>
                    </Badge>
                  )}

                  {/* Chế độ */}
                  {event.isAdvancedMode ? (
                    <Badge
                      variant="outline"
                      className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0"
                    >
                      <Layers className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                      <span>{t("mode_advanced")}</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0"
                    >
                      <span>{t("mode_basic")}</span>
                    </Badge>
                  )}

                  {/* Tiền tệ */}
                  <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0">
                    {event.baseCurrency}
                  </span>
                </div>

                {/* Hàng 3: Metadata (Số thành viên, Số khoản chi & Ngày tạo) */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80 pl-7">
                  <div className="flex items-center gap-2.5">
                    <button 
                      type="button"
                      className="flex items-center gap-1 hover:text-blue-600 hover:underline cursor-pointer group"
                      onClick={() => setSelectedEventIdForMembers(event.id)}
                    >
                      <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      <span>
                        {t("stats_participants", {
                          count: event._count.participants,
                        })}
                      </span>
                    </button>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {t("stats_expenses", {
                          count: event._count.expenses,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{formatDate(event.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop View (>= md): Bảng Table */}
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
                {t("colTitle")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("colMode")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("colCurrency")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("colStats")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("colStatus")}
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
            {events.map((event) => {
              const isSelected = selectedIds.has(event.id);

              return (
                <TableRow
                  key={event.id}
                  className={`hover:bg-slate-50/80 transition-colors border-slate-100 ${
                    isSelected ? "bg-emerald-50/40 hover:bg-emerald-50/60" : ""
                  }`}
                >
                  {/* Cột Checkbox */}
                  <TableCell className="pl-4 sm:pl-6 py-3.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleSelectRow(event.id)}
                      aria-label={`Select ${event.title}`}
                      className="cursor-pointer"
                    />
                  </TableCell>

                  {/* Cột 1: Tên sự kiện & UUID */}
                  <TableCell className="py-3.5">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {event.title}
                      </span>
                      <div>
                        <EventIdBadge id={event.id} />
                      </div>
                    </div>
                  </TableCell>

                  {/* Cột 2: Chế độ */}
                  <TableCell className="py-3.5">
                    {event.isAdvancedMode ? (
                      <Badge
                        variant="outline"
                        className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5"
                      >
                        <Layers className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>{t("mode_advanced")}</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-600 border-slate-200 text-[11px] font-medium rounded-full px-2.5 py-0.5"
                      >
                        <span>{t("mode_basic")}</span>
                      </Badge>
                    )}
                  </TableCell>

                  {/* Cột 3: Tiền tệ */}
                  <TableCell className="py-3.5">
                    <span className="font-mono text-xs font-bold text-slate-700 px-2 py-1 bg-slate-100 rounded-md">
                      {event.baseCurrency}
                    </span>
                  </TableCell>

                  {/* Cột 4: Thống kê thành viên & chi phí */}
                  <TableCell className="py-3.5 text-xs text-slate-600">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-blue-600 hover:underline cursor-pointer group"
                        onClick={() => setSelectedEventIdForMembers(event.id)}
                      >
                        <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                        <span>
                          {t("stats_participants", {
                            count: event._count.participants,
                          })}
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {t("stats_expenses", {
                            count: event._count.expenses,
                          })}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Cột 5: Trạng thái (Hoạt động / Đã khóa) */}
                  <TableCell className="py-3.5">
                    {event.isLocked ? (
                      <Badge
                        variant="outline"
                        className="bg-rose-50 text-rose-700 border-rose-200 gap-1 font-semibold text-[11px] rounded-full px-2.5 py-0.5"
                      >
                        <Lock className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>{t("status_badge_locked")}</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-semibold text-[11px] rounded-full px-2.5 py-0.5"
                      >
                        <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{t("status_badge_active")}</span>
                      </Badge>
                    )}
                  </TableCell>

                  {/* Cột 6: Ngày tạo */}
                  <TableCell className="py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(event.createdAt)}
                  </TableCell>

                  {/* Cột 7: Thao tác Dropdown */}
                  <TableCell className="text-right pr-5 sm:pr-6 py-3.5">
                    <EventActionsDropdown event={event} />
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
        {/* Nút 1: Khóa sổ hàng loạt */}
        <Button
          size="sm"
          onClick={() => handleBulkToggleLock(true)}
          disabled={isPending}
          className="rounded-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8 px-3 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{t("bulk_lock")}</span>
        </Button>

        {/* Nút 2: Mở khóa sổ hàng loạt */}
        <Button
          size="sm"
          onClick={() => handleBulkToggleLock(false)}
          disabled={isPending}
          className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Unlock className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{t("bulk_unlock")}</span>
        </Button>

        {/* Nút 3: Xóa sự kiện hàng loạt */}
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

      {/* Modal xác nhận xóa sự kiện hàng loạt */}
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
      <EventMembersSheet
        eventId={selectedEventIdForMembers}
        isOpen={!!selectedEventIdForMembers}
        onClose={() => setSelectedEventIdForMembers(null)}
      />
    </>
  );
}
