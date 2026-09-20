import { getEventById } from "@/actions/event";
import { notFound } from "next/navigation";
import { IdentityProvider } from "@/providers/IdentityProvider";
import ShareButton from "@/components/event/ShareButton";
import { cookies } from "next/headers";
import CurrencySettingButton from "@/components/event/CurrencySettingButton";
import EventSettingsButton from "@/components/event/EventSettingsButton";
import { LanguageSwitcher } from "@/components/core/LanguageSwitcher";
import { getTranslations } from "next-intl/server";
import RecentEventTracker from "@/components/event/RecentEventTracker";
import EventTitleHeader from "@/components/event/EventTitleHeader";
import ClaimEventBanner from "@/components/event/ClaimEventBanner";
import AdminViewBanner from "@/components/event/AdminViewBanner";
import EventBackButton from "@/components/event/EventBackButton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

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
      title: "Group not found | Wari App",
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
      siteName: "Wari App",
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

  const event = await getEventById(eventId);
  
  if (!event) {
    notFound();
  }

  // Lấy session xác thực và deviceToken từ cookie
  const session = await auth();
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get("split-app-device-token")?.value;

  // Tìm participant tương ứng: ưu tiên theo User ID nếu đã đăng nhập, fallback sang deviceToken
  const userParticipant = session?.user?.id
    ? event.participants.find((p) => p.userId === session.user.id)
    : null;

  const currentParticipant =
    userParticipant ||
    (deviceToken
      ? event.participants.find((p) => p.deviceToken === deviceToken)
      : null);

  // So sánh quyền Creator: khớp deviceToken HOẶC participant của user chính là creator
  const isCreator = !!(
    (deviceToken && event.creatorDeviceToken === deviceToken) ||
    (userParticipant && userParticipant.deviceToken && userParticipant.deviceToken === event.creatorDeviceToken)
  );

  // Đếm số thành viên thực tế (bỏ qua Quỹ công ty)
  const realMemberCount = event.participants.filter(p => p.name !== "🏢 Quỹ Công ty").length;

  // Kiểm tra quyền Admin và xác định xem Admin đã gắn danh tính (Participant) trong sự kiện chưa
  const isAdmin = session?.user?.role === "ADMIN";
  const isAdminParticipant = isAdmin && !!userParticipant;
  const showAdminBanner = isAdmin && !isAdminParticipant;

  // Admin chưa là Participant + không phải đang impersonate → được override toàn quyền Creator
  const isAdminOverride = isAdmin && !isAdminParticipant && !session?.user?.isImpersonated;

  // isEffectiveCreator: Creator thực sự HOẶC Admin đang override
  const isEffectiveCreator = isCreator || isAdminOverride;

  // Kiểm tra xem user hiện tại đã là thành viên trong event chưa (nhận diện theo userId)
  const isUserParticipant = !!userParticipant;

  // Tên mặc định nếu người dùng đã đăng nhập (Google Auth hoặc Email/Password)
  let defaultUserName = session?.user?.name || (session?.user?.email ? session.user.email.split("@")[0] : "");
  if (!defaultUserName && session?.user?.id) {
    const userInDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    if (userInDb) {
      defaultUserName = userInDb.name || (userInDb.email ? userInDb.email.split("@")[0] : "");
    }
  }

  const isImpersonated = !!session?.user?.isImpersonated;

  return (
    <IdentityProvider
      eventId={event.id}
      participants={event.participants}
      hasPasscode={!!event.passcode}
      currentUserName={defaultUserName}
    >
      <div
        className={cn(
          "bg-slate-50 flex flex-col font-sans overflow-hidden",
          isImpersonated ? "h-[calc(100dvh-44px)]" : "h-dvh"
        )}
        style={{
          height: `calc(100dvh - var(--impersonation-banner-height, ${isImpersonated ? "44px" : "0px"}))`,
        }}
      >
        
        {/* 1. TOP HEADER: Chỉ chứa điều hướng và công cụ (Rất thoáng) */}
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-sm">
          <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
            
            {/* CỤM TRÁI: Nút Back (về Admin hoặc Trang chủ dựa theo ngữ cảnh) */}
            <div className="flex items-center">
              <EventBackButton
                isAdmin={isAdmin}
                showAdminBanner={showAdminBanner}
              />
            </div>

            {/* CỤM PHẢI: Các nút công cụ */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ShareButton eventId={event.id} />
              <LanguageSwitcher />
              <CurrencySettingButton
                eventId={event.id}
                currentCurrency={event.baseCurrency}
                isCreator={isEffectiveCreator}
              />
              {isEffectiveCreator && (
                <EventSettingsButton
                  eventId={event.id}
                  isAdvancedMode={event.isAdvancedMode}
                  currentRoundingMode={(event.roundingMode as "ROUND_ROBIN" | "ROUND_UP") || "ROUND_ROBIN"}
                  initialPasscode={event.passcode ?? null}
                  isCreator={isEffectiveCreator}
                  isUserLinked={!!(currentParticipant?.userId || userParticipant)}
                />
              )}
            </div>

          </div>
        </header>

        {/* Container Chính */}
        <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 bg-transparent sm:my-6 min-h-0 overflow-hidden relative">
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-white sm:shadow-md sm:rounded-3xl sm:border border-slate-200/60">
            
            {/* Banner dành cho Quản trị viên xem sự kiện */}
            {showAdminBanner && (
              <AdminViewBanner
                eventId={event.id}
                isAdminOverride={isAdminOverride}
              />
            )}

            {/* 2. SUB-HEADER: Tiêu đề nhóm và đổi tên sự kiện */}
            <EventTitleHeader
              eventId={event.id}
              initialTitle={event.title}
              isCreator={isEffectiveCreator}
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

        <RecentEventTracker eventId={event.id} title={event.title} />
      </div>
    </IdentityProvider>
  );
}