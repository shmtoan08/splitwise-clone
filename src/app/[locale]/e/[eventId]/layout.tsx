import { getEventById } from "@/actions/event";
import { notFound } from "next/navigation";
import ClaimIdentityModal from "@/components/event/ClaimIdentityModal";
import ShareButton from "@/components/event/ShareButton";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { cookies } from "next/headers";
import CurrencySettingButton from "@/components/event/CurrencySettingButton";
import AdvancedModeSwitch from "@/components/event/AdvancedModeSwitch";
import { getTranslations } from "next-intl/server";
import RecentEventTracker from "@/components/event/RecentEventTracker";

type Props = {
  children: React.ReactNode;
  params: Promise<{ eventId: string; locale: string }>;
};

export default async function EventLayout({ children, params }: Props) {
  const { eventId } = await params;
  const t = await getTranslations("event");
  const tCommon = await getTranslations("common");

  const event = await getEventById(eventId);
  
  if (!event) {
    notFound();
  }

  // So sánh deviceToken để biết ai là creator
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get("split-app-device-token")?.value;
  const isCreator = !!(deviceToken && event.creatorDeviceToken === deviceToken);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          
          {/* CỤM TRÁI: Nút Back + Tiêu đề (Đã xử lý min-w-0 để không vỡ layout) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            
            {/* PHƯƠNG ÁN 2: Nút Back Responsive & Micro-interaction */}
            <Link 
              href="/" 
              className={buttonVariants({ 
                variant: "ghost", 
                className: "shrink-0 rounded-full h-10 px-2 sm:px-3 active:scale-95 transition-all -ml-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 group flex items-center gap-1.5" 
              })}
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:block text-sm font-semibold pr-1">
                {tCommon("home")}
              </span>
            </Link>
            
            {/* Tiêu đề nhóm */}
            <div className="flex flex-col leading-tight min-w-0">
              <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                {event.title}
              </h1>
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5 truncate">
                {t("memberCount", { count: event.participants.length })}
              </span>
            </div>
          </div>

          {/* CỤM PHẢI: shrink-0 để giữ nguyên kích thước các nút hành động */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isCreator && (
              <AdvancedModeSwitch eventId={event.id} isAdvancedMode={event.isAdvancedMode} />
            )}
            <ShareButton eventId={event.id} />
            <CurrencySettingButton
              eventId={event.id}
              currentCurrency={event.baseCurrency}
              isCreator={isCreator}
            />
          </div>

        </div>
      </header>

      {/* Container Chính */}
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 bg-transparent sm:my-6 overflow-hidden relative">
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-white sm:shadow-md sm:rounded-3xl sm:border border-slate-200/60">
          {children}
        </div>
      </main>

      <ClaimIdentityModal eventId={event.id} participants={event.participants} />
      <RecentEventTracker eventId={event.id} title={event.title} />
    </div>
  );
}