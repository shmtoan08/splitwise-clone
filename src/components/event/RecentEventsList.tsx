"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRecentEvents } from "@/hooks/useRecentEvents";
import EventQuickViewModal from "./EventQuickViewModal";
import { BarChart2 } from "lucide-react";



// ── Component ─────────────────────────────────────────────────────────────

export default function RecentEventsList() {
  const t = useTranslations("home");
  const { recentEvents } = useRecentEvents();
  const [isMounted, setIsMounted] = useState(false);

  // Modal state
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeEventTitle, setActiveEventTitle] = useState<string>("");

  // Local cache: eventId → SummaryData (managed inside EventQuickViewModal)

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleOpenQuickView = useCallback(
    (e: React.MouseEvent, eventId: string, eventTitle: string) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveEventId(eventId);
      setActiveEventTitle(eventTitle);
    },
    []
  );

  if (!isMounted || !recentEvents || recentEvents.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
        {t("recentGroups")}
      </h2>
      <ul className="space-y-2.5">
        {recentEvents.map((event) => (
          <li key={event.id} className="group">
            <div className="flex items-center bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-200">
              {/* Main link */}
              <Link
                href={`/e/${event.id}`}
                className="flex-1 flex items-center gap-3 px-4 py-3.5 min-w-0"
              >
                {/* Gradient dot */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-white font-extrabold text-sm">
                    {event.title.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Name + date */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{event.title}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {new Date(event.lastVisitedAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>

              </Link>


              {/* Quick View button */}
              <button
                onClick={(e) => handleOpenQuickView(e, event.id, event.title)}
                className="shrink-0 h-full px-3 py-3.5 border-l border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 flex flex-col items-center justify-center gap-0.5"
                title={t("quickViewTooltip")}
                aria-label={t("quickViewAria", { title: event.title })}
              >
                <BarChart2 className="w-4 h-4" />
                <span className="text-[9px] font-bold tracking-tight">{t("quickViewLabel")}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Quick View Modal */}
      {activeEventId && (
        <EventQuickViewModal
          eventId={activeEventId}
          eventTitle={activeEventTitle}
          open={!!activeEventId}
          onOpenChange={(open) => {
            if (!open) setActiveEventId(null);
          }}
        />
      )}
    </div>
  );
}
