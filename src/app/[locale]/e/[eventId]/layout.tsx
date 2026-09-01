import { getEventById } from "@/actions/event";
import { notFound } from "next/navigation";
import ClaimIdentityModal from "@/components/event/ClaimIdentityModal";
import ShareButton from "@/components/event/ShareButton";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { cookies } from "next/headers";
import CurrencySettingButton from "@/components/event/CurrencySettingButton";
import EventSettingsButton from "@/components/event/EventSettingsButton";
import { LanguageSwitcher } from "@/components/core/LanguageSwitcher";
import { getTranslations } from "next-intl/server";
import RecentEventTracker from "@/components/event/RecentEventTracker";
import EventTitleHeader from "@/components/event/EventTitleHeader";
import ClaimEventBanner from "@/components/event/ClaimEventBanner";

import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ eventId: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId, locale } = await params;
  const event = await getEventById(eventId);
  
  if (!event) {
    return {
      title: "Group not found | Splitwise Clone",
    };
  }

  const t = await getTranslations({ locale, namespace: "event" });
  const title = event.title;
  const description = t("metaDescription", { fallback: "Tham gia nhóm để xem chi tiết các khoản chi và đối trừ nợ." });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Splitwise Clone",
      images: ["/og-image.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.jpg"],
    },
  };
}

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

  // Tìm participant tương ứng với thiết bị hiện tại
  const currentParticipant = deviceToken
    ? event.participants.find((p) => p.deviceToken === deviceToken)
    : null;

  // Đếm số thành viên thực tế (bỏ qua Quỹ công ty)
  const realMemberCount = event.participants.filter(p => p.name !== "🏢 Quỹ Công ty").length;

  return (
    <div className="h-dvh bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* 1. TOP HEADER: Chỉ chứa điều hướng và công cụ (Rất thoáng) */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          
          {/* CỤM TRÁI: Chỉ còn nút Back */}
          <div className="flex items-center">
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
          </div>

          {/* CỤM PHẢI: Các nút công cụ */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ShareButton eventId={event.id} />
            <LanguageSwitcher />
            <CurrencySettingButton
              eventId={event.id}
              currentCurrency={event.baseCurrency}
              isCreator={isCreator}
            />
            {isCreator && (
              <EventSettingsButton
                eventId={event.id}
                isAdvancedMode={event.isAdvancedMode}
                currentRoundingMode={(event.roundingMode as any) || "ROUND_ROBIN"}
                initialPasscode={event.passcode ?? null}
                isCreator={isCreator}
              />
            )}
          </div>

        </div>
      </header>

      {/* Container Chính */}
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 bg-transparent sm:my-6 min-h-0 overflow-hidden relative">
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-white sm:shadow-md sm:rounded-3xl sm:border border-slate-200/60">
          
          {/* 2. SUB-HEADER: Tiêu đề nhóm và đổi tên sự kiện */}
          <EventTitleHeader
            eventId={event.id}
            initialTitle={event.title}
            isCreator={isCreator}
            isLocked={event.isLocked}
            memberCount={realMemberCount}
          />

          {/* Banner Lưu nhóm vào tài khoản đã đăng nhập */}
          <ClaimEventBanner
            eventId={event.id}
            hasParticipant={!!currentParticipant}
            participantUserId={currentParticipant?.userId ?? null}
          />

          {/* Vùng chứa nội dung các Tabs */}
          {children}
        </div>
      </main>

      <ClaimIdentityModal
        eventId={event.id}
        participants={event.participants}
        hasPasscode={!!event.passcode}
      />
      <RecentEventTracker eventId={event.id} title={event.title} />
    </div>
  );
}