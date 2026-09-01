"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { linkParticipantToUser } from "@/actions/participant";
import { Button } from "@/components/ui/button";
import { BookmarkPlus, Loader2, Sparkles, Check } from "lucide-react";
import { useRouter } from "@/i18n/routing";

interface ClaimEventBannerProps {
  eventId: string;
  hasParticipant: boolean;
  participantUserId: string | null;
}

export default function ClaimEventBanner({
  eventId,
  hasParticipant,
  participantUserId,
}: ClaimEventBannerProps) {
  const { data: session, status } = useSession();
  const t = useTranslations("participant");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // CHỈ hiển thị khi:
  // 1. Người dùng đã đăng nhập (authenticated)
  // 2. Thiết bị này ĐÃ nhận 1 participant trong nhóm (hasParticipant === true)
  // 3. Participant trên thiết bị này chưa được liên kết với User (participantUserId === null)
  // 4. Chưa bấm link thành công ở phiên này
  if (
    status !== "authenticated" ||
    !session?.user ||
    !hasParticipant ||
    participantUserId !== null ||
    isSuccess
  ) {
    return null;
  }

  const handleClaim = async () => {
    setIsLoading(true);
    setError(null);

    const res = await linkParticipantToUser(eventId);
    setIsLoading(false);

    if (!res.success) {
      if (res.error === "already_linked") {
        setError(t("already_linked"));
      } else if (res.error === "participant_not_found") {
        setError(t("participant_not_found"));
      } else if (res.error === "missing_device_token") {
        setError(t("missing_device_token"));
      } else if (res.error === "unauthorized") {
        setError(t("unauthorized"));
      } else {
        setError(res.error || tCommon("error"));
      }
    } else {
      setIsSuccess(true);
      startTransition(() => {
        router.refresh();
      });
    }
  };

  return (
    <div className="mx-3 sm:mx-6 my-2.5 sm:my-3 p-3 sm:p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50/60 to-blue-50 border border-blue-200/80 rounded-2xl shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0">
            <BookmarkPlus className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-bold text-blue-950 flex items-center gap-1.5">
              <span>{t("claimEventBannerTitle")}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            </h4>
            <p className="text-[11px] sm:text-xs text-blue-800/80 leading-relaxed">
              {t("claimEventBannerDesc")}
            </p>
            {error && (
              <p className="text-xs font-semibold text-rose-600 pt-0.5">
                {error}
              </p>
            )}
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleClaim}
          disabled={isLoading}
          className="rounded-full h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm active:scale-95 transition-all shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{tCommon("loading")}</span>
            </>
          ) : (
            <>
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{t("claimEventBannerBtn")}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
