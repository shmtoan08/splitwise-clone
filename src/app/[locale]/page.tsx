import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import CreateEventForm from "@/components/event/CreateEventForm";
import RecentEventsList from "@/components/event/RecentEventsList";
import { LanguageSwitcher } from "@/components/core/LanguageSwitcher";
import { AuthModal } from "@/components/auth/AuthModal";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserCircle, Wallet } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });
  return {
    title: t('homeTitle'),
  };
}


export default async function HomePage() {
  const t = await getTranslations();
  const session = await auth();
  
  return (
    <main className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Nền mờ ảo (Glow) phía sau form */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-emerald-400/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* HEADER NÂNG CẤP */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md shadow-sm">
        {/* Inner Container: Khóa chiều rộng header ngang bằng với nội dung (max-w-5xl) */}
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between p-3 sm:p-4 px-4 sm:px-6 lg:px-8">
          
          {/* Trái: Brand / Logo (Giúp neo giữ thị giác, cân bằng 2 bên) */}
          <div className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800 tracking-tight hidden sm:block">
              {t("app.name")}
            </span>
          </div>

          {/* Phải: Actions (Ngôn ngữ + Đăng nhập) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            
            {!session?.user ? (
              <AuthModal variant="ghost" className="rounded-full font-semibold px-4" triggerText={t("Core.login_button")} />
            ) : (
              <Button variant="outline" className="rounded-full flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all h-9 px-3 sm:px-4">
                <UserCircle className="w-4 h-4 text-slate-500" />
                <span className="max-w-[100px] sm:max-w-[150px] truncate text-sm font-medium">
                  {session.user.name || session.user.email || t("Core.my_account")}
                </span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col items-center gap-12 p-4 sm:p-6 lg:p-8 pt-10 lg:pt-16 z-10">
    
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {t("app.freeNoLoginBadge")}
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight break-words bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 leading-tight">
            {t("app.name")}
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto">
            {t("app.tagline")}
          </p>
        </div>
        
        {/* Form và List */}
        <div className="w-full flex flex-col items-center gap-12 sm:gap-16">
          {/* Form */}
          <div className="w-full sm:max-w-md animate-in fade-in zoom-in-95 duration-500 delay-150 fill-mode-both">
            <CreateEventForm />
          </div>
          
          {/* List Nhóm Gần Đây */}
          <div className="w-full animate-in fade-in duration-500 delay-300 fill-mode-both">
            <RecentEventsList />
          </div>
        </div>
      </div>
    </main>
  );
}