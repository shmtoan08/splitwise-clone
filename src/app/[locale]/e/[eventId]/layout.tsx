import { getEventById } from "@/actions/event";
import { notFound } from "next/navigation";
import ClaimIdentityModal from "@/components/event/ClaimIdentityModal";
import ShareButton from "@/components/event/ShareButton";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  params: Promise<{ eventId: string; locale: string }>;
};

import EventTabsNav from "@/components/event/EventTabsNav";
import { getTranslations } from "next-intl/server";

export default async function EventLayout({ children, params }: Props) {
  const { eventId } = await params;
  const t = await getTranslations("event");

  const event = await getEventById(eventId);
  
  if (!event) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link 
              href="/" 
              className={buttonVariants({ variant: "ghost", size: "icon", className: "rounded-full w-9 h-9 active:scale-95 transition-all -ml-2" })}
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-slate-900 truncate max-w-[160px] sm:max-w-xs text-lg">
                {event.title}
              </span>
              <p className="text-xs font-medium text-slate-500 mt-1">
                {t("memberCount", { count: event.participants.length })}
              </p>
            </div>
          </div>
          <ShareButton eventId={event.id} />
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-lg mx-auto bg-white shadow-sm sm:my-4 sm:rounded-2xl overflow-hidden relative">
        <EventTabsNav eventId={event.id} />
        <div className="flex-1 min-h-0 flex flex-col relative overflow-y-auto">
          {children}
        </div>
      </main>

      <ClaimIdentityModal eventId={event.id} participants={event.participants} />
    </div>
  );
}

