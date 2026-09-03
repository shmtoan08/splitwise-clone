import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getUserDashboardData } from "@/actions/user";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/core/LanguageSwitcher";
import { UserNav } from "@/components/auth/UserNav";
import { 
  FolderOpen, 
  Users, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  Wallet, 
  Lock, 
  PlusCircle,
  UserCircle,
  Sparkles,
  Receipt
} from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return {
    title: `${t("title")} | Split App`,
    description: t("description"),
  };
}

export default async function DashboardPage() {
  const session = await auth();

  // Route protection: chuyển hướng về trang chủ nếu chưa đăng nhập
  if (!session?.user) {
    redirect("/");
  }

  const t = await getTranslations("dashboard");
  const tApp = await getTranslations("app");
  const events = await getUserDashboardData();

  function formatDate(date: Date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 font-sans">
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Cụm trái: Nút quay lại trang chủ + Logo */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={buttonVariants({
                variant: "ghost",
                className:
                  "rounded-full h-9 px-2.5 sm:px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 active:scale-95 transition-all -ml-2",
              })}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-semibold hidden sm:inline">
                {t("backHome")}
              </span>
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <Link href="/" className="flex items-center gap-2 select-none group">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base text-slate-800 tracking-tight hidden md:inline">
                {tApp("name")}
              </span>
            </Link>
          </div>

          {/* Cụm phải: Language switcher + User profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <UserNav user={session.user} />
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Tiêu đề trang */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{tApp("name")} Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t("title")}
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              {t("description")}
            </p>
          </div>

          <Link
            href="/"
            className={buttonVariants({
              className:
                "rounded-full h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all flex items-center gap-2 shrink-0 self-start sm:self-center",
            })}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t("createEventBtn")}</span>
          </Link>
        </div>

        {/* 3. NỘI DUNG CHÍNH (EMPTY STATE HOẶC GRID) */}
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-slate-200/80 rounded-3xl text-center shadow-xs animate-in fade-in zoom-in-95 duration-200 my-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-4 shadow-2xs">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1.5">
              {t("emptyTitle")}
            </h3>
            <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
              {t("emptyDesc")}
            </p>
            <Link
              href="/"
              className={buttonVariants({
                className:
                  "rounded-full h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all flex items-center gap-2",
              })}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t("createEventBtn")}</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in duration-300">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/e/${event.id}`}
                className="group block focus:outline-none"
              >
                <div className="h-full bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-emerald-300 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between gap-4">
                  {/* Header của Card */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1 flex-1">
                        {event.title}
                      </h2>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {event.isLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <Lock className="w-2.5 h-2.5" />
                            {t("lockedBadge")}
                          </span>
                        )}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {event.baseCurrency}
                        </span>
                      </div>
                    </div>

                    {/* Vai trò của user nếu có */}
                    {event.userParticipantName && (
                      <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                        <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {t("myRole")} <strong className="text-slate-800">{event.userParticipantName}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tổng chi tiêu */}
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        {t("totalExpense")}
                      </div>
                      <div className="text-sm sm:text-base font-extrabold text-slate-900">
                        {event.totalExpenseAmount.toLocaleString()} {event.baseCurrency}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-slate-400" />
                        <span>{t("expenseCount", { count: event.expenseCount })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer của Card */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t("memberCount", { count: event.memberCount })}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(event.createdAt)}</span>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all">
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
