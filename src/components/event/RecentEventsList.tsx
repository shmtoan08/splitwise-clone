"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRecentEvents } from "@/hooks/useRecentEvents";
import { useState, useEffect } from "react";

export default function RecentEventsList() {
  const t = useTranslations("home");
  const { recentEvents } = useRecentEvents();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !recentEvents || recentEvents.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto mt-12">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        {t("recentGroups")}
      </h2>
      <ul className="space-y-3">
        {recentEvents.map((event) => (
          <li key={event.id}>
            <Link
              href={`/e/${event.id}`}
              className="block p-4 bg-white border border-gray-100 shadow-sm rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">{event.title}</span>
                <span className="text-sm text-gray-400">
                  {new Date(event.lastVisitedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
