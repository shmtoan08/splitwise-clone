"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import ClaimIdentityModal from "@/components/event/ClaimIdentityModal";

type Participant = {
  id: string;
  name: string;
  deviceToken: string | null;
  userId?: string | null;
};

interface AdminViewBannerProps {
  eventId: string;
  participants?: Participant[];
  hasPasscode?: boolean;
  currentUserName?: string;
}

export default function AdminViewBanner({
  eventId,
  participants = [],
  hasPasscode = false,
  currentUserName,
}: AdminViewBannerProps) {
  const t = useTranslations("event");
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  return (
    <>
      <div className="w-full bg-purple-50 border-b border-purple-200/80 px-3.5 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-purple-700 animate-in fade-in duration-200">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="font-medium">
            {t("adminViewBannerText")}
          </span>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <Link
            href="/admin/events"
            className="text-purple-800 font-semibold underline underline-offset-2 hover:text-purple-950 transition-colors cursor-pointer text-xs inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t("backToAdminEvents")}</span>
          </Link>

          <span className="text-purple-300">•</span>

          <button
            type="button"
            onClick={() => setIsClaimModalOpen(true)}
            className="text-purple-800 font-semibold underline underline-offset-2 hover:text-purple-950 transition-colors cursor-pointer text-xs"
          >
            {t("adminViewBannerClaimBtn")}
          </button>
        </div>
      </div>

      {isClaimModalOpen && (
        <ClaimIdentityModal
          eventId={eventId}
          participants={participants}
          hasPasscode={hasPasscode}
          forceOpen={true}
          currentUserName={currentUserName}
          onClose={() => setIsClaimModalOpen(false)}
        />
      )}
    </>
  );
}
