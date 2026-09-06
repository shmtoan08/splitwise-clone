import { getTranslations, getLocale } from "next-intl/server";
import { getDashboardStats } from "@/actions/admin/dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Users,
  CalendarRange,
  Receipt,
  ExternalLink,
  Lock,
  CheckCircle2,
  Sparkles,
  Inbox,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const t = await getTranslations("adminDashboard");
  const locale = await getLocale();

  let statsData = {
    totalUsers: 0,
    totalEvents: 0,
    totalExpenses: 0,
    recentEvents: [] as Awaited<ReturnType<typeof getDashboardStats>>["recentEvents"],
  };

  try {
    statsData = await getDashboardStats();
  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }

  const { totalUsers, totalEvents, totalExpenses, recentEvents } = statsData;

  const kpiCards = [
    {
      title: t("kpi.users"),
      desc: t("kpi.usersDesc"),
      value: totalUsers.toLocaleString(locale),
      icon: Users,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      accent: "from-blue-500/10 to-indigo-500/5",
      borderColor: "hover:border-blue-300",
      href: "/admin/users",
    },
    {
      title: t("kpi.events"),
      desc: t("kpi.eventsDesc"),
      value: totalEvents.toLocaleString(locale),
      icon: CalendarRange,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
      accent: "from-emerald-500/10 to-teal-500/5",
      borderColor: "hover:border-emerald-300",
      href: "/admin/events",
    },
    {
      title: t("kpi.expenses"),
      desc: t("kpi.expensesDesc"),
      value: totalExpenses.toLocaleString(locale),
      icon: Receipt,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100",
      accent: "from-purple-500/10 to-pink-500/5",
      borderColor: "hover:border-purple-300",
    },
  ];

  const formatDate = (date: Date) => {
    try {
      return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleDateString();
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>{t("title")}</span>
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          {t("description")}
        </p>
      </div>

      {/* Phần 1: KPI Cards Grid (1 cột mobile, 3 cột desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          const cardBody = (
            <Card
              className={cn(
                "relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br shadow-xs transition-all duration-200 h-full",
                card.accent,
                card.borderColor,
                card.href && "cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CardTitle
                    className={cn(
                      "text-sm font-semibold text-slate-700 truncate",
                      card.href && "group-hover:text-slate-900 transition-colors"
                    )}
                  >
                    {card.title}
                  </CardTitle>
                  {card.href && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  )}
                </div>
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-xs shrink-0 transition-transform duration-200",
                    card.href && "group-hover:scale-105",
                    card.iconBg,
                    card.iconColor
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {card.value}
                </div>
                <CardDescription className="text-xs text-slate-500 mt-2 font-medium">
                  {card.desc}
                </CardDescription>
              </CardContent>
            </Card>
          );

          if (card.href) {
            return (
              <Link
                key={idx}
                href={card.href}
                className="group block rounded-2xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {cardBody}
              </Link>
            );
          }

          return <div key={idx}>{cardBody}</div>;
        })}
      </div>

      {/* Phần 2: Recent Events Table */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-5 sm:px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base sm:text-lg font-bold text-slate-800">
              {t("recentEvents.title")}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-500">
              {t("recentEvents.description")}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {recentEvents.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 gap-2">
              <Inbox className="w-8 h-8 stroke-1" />
              <p className="text-sm">{t("recentEvents.empty")}</p>
            </div>
          ) : (
            <>
              {/* Mobile View (< md): Danh sách dạng Card tối ưu hóa cho màn hình nhỏ */}
              <div className="md:hidden divide-y divide-slate-100">
                {recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 flex flex-col gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Hàng 1: Tên sự kiện, Tiền tệ & Trạng thái */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900 line-clamp-1 break-all">
                            {evt.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0">
                            {evt.baseCurrency}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatDate(evt.createdAt)}</span>
                        </div>
                      </div>

                      {/* Trạng thái */}
                      <div className="shrink-0">
                        {evt.isLocked ? (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-700 border-slate-200 gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
                          >
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                            <span>{t("recentEvents.statusLocked")}</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{t("recentEvents.statusOpen")}</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Hàng 2: Thống kê thành viên, chi phí & Nút hành động */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80">
                      <div className="flex items-center gap-2.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {t("recentEvents.membersCount", {
                              count: evt._count.participants,
                            })}
                          </span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {t("recentEvents.expensesCount", {
                              count: evt._count.expenses,
                            })}
                          </span>
                        </div>
                      </div>

                      <a
                        href={`/e/${evt.id}?from=admin`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "h-7 px-2.5 text-[11px] font-semibold rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 gap-1 inline-flex items-center active:scale-95 transition-all shrink-0"
                        )}
                      >
                        <span>{t("recentEvents.viewDetail")}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="w-[35%] min-w-[200px] text-xs font-semibold uppercase tracking-wider text-slate-500 pl-5 sm:pl-6">
                        {t("recentEvents.colName")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {t("recentEvents.colMembers")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {t("recentEvents.colExpenses")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {t("recentEvents.colStatus")}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {t("recentEvents.colCreatedAt")}
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 pr-5 sm:pr-6">
                        {t("recentEvents.colAction")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEvents.map((evt) => (
                      <TableRow
                        key={evt.id}
                        className="hover:bg-slate-50/80 transition-colors border-slate-100"
                      >
                        {/* Tên sự kiện */}
                        <TableCell className="font-medium text-slate-800 pl-5 sm:pl-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-slate-900 line-clamp-1">
                              {evt.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {evt.baseCurrency}
                            </span>
                          </div>
                        </TableCell>

                        {/* Số thành viên */}
                        <TableCell className="text-slate-600 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {t("recentEvents.membersCount", {
                                count: evt._count.participants,
                              })}
                            </span>
                          </div>
                        </TableCell>

                        {/* Số khoản chi */}
                        <TableCell className="text-slate-600 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {t("recentEvents.expensesCount", {
                                count: evt._count.expenses,
                              })}
                            </span>
                          </div>
                        </TableCell>

                        {/* Trạng thái */}
                        <TableCell>
                          {evt.isLocked ? (
                            <Badge
                              variant="outline"
                              className="bg-slate-100 text-slate-700 border-slate-200 gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5"
                            >
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span>{t("recentEvents.statusLocked")}</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{t("recentEvents.statusOpen")}</span>
                            </Badge>
                          )}
                        </TableCell>

                        {/* Ngày tạo */}
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(evt.createdAt)}
                        </TableCell>

                        {/* Thao tác nhanh */}
                        <TableCell className="text-right pr-5 sm:pr-6">
                          <a
                            href={`/e/${evt.id}?from=admin`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 gap-1 inline-flex items-center active:scale-95 transition-all"
                            )}
                          >
                            <span className="hidden sm:inline">{t("recentEvents.viewDetail")}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
