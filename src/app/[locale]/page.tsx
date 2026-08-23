import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import CreateEventForm from "@/components/event/CreateEventForm";
import RecentEventsList from "@/components/event/RecentEventsList";
import { LanguageSwitcher } from "@/components/core/LanguageSwitcher";
import { CurrencySwitcher } from "@/components/core/CurrencySwitcher";
import { AuthModal } from "@/components/auth/AuthModal";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Tạo nhóm chia tiền",
};

// Trang chủ: tạo nhóm mới + hiển thị nhóm gần đây (từ LocalStorage)
// Server Component — data fetching không cần ở đây, localStorage đọc ở client
export default async function HomePage() {
  const t = await getTranslations();
  const session = await auth();
  
  return (
    <main className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Nền mờ ảo (Glow) phía sau form */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl h-[300px] bg-emerald-400/20 blur-[100px] rounded-full pointer-events-none"></div>

      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md flex items-center justify-end p-4 gap-3 shadow-sm">
        <LanguageSwitcher />
        <CurrencySwitcher />
        {!session?.user ? (
          <AuthModal variant="ghost" className="rounded-full font-medium" triggerText={t("Core.login_button")} />
        ) : (
          <Button variant="outline" className="rounded-full flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all">
            <UserCircle className="w-4 h-4 text-slate-500" />
            <span className="max-w-[120px] truncate">{session.user.name || session.user.email || t("Core.my_account")}</span>
          </Button>
        )}
      </header>

      <div className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center gap-10 p-4 sm:p-8 pt-12 sm:pt-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight break-words bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-400">
            {t("app.name")}
          </h1>
          <p className="text-lg text-slate-500 font-medium">
            {t("app.tagline")}
          </p>
        </div>
        
        <div className="w-full space-y-10">
          <CreateEventForm />
          <RecentEventsList />
        </div>
      </div>
    </main>
  );
}
