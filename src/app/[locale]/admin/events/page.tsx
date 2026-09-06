import { getTranslations, getLocale } from "next-intl/server";
import { getAdminEvents } from "@/actions/admin/event";
import { Card, CardContent } from "@/components/ui/card";
import { EventFilterToolbar } from "@/components/admin/EventFilterToolbar";
import { EventPagination } from "@/components/admin/EventPagination";
import { EventsTableClient } from "@/components/admin/EventsTableClient";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminEvents" });
  return {
    title: `${t("title")} | Wari Admin`,
    description: t("description"),
  };
}

interface AdminEventsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function AdminEventsPage({ searchParams }: AdminEventsPageProps) {
  const t = await getTranslations("adminEvents");
  const locale = await getLocale();

  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page || "1", 10) || 1;
  const search = resolvedSearchParams.search || "";
  const status = resolvedSearchParams.status || "ALL";

  const { events, totalEvents, currentPage, totalPages } = await getAdminEvents({
    page,
    pageSize: 10,
    search,
    status,
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t("title")}</span>
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            {t("description")}
          </p>
        </div>

        <div className="w-full lg:w-auto">
          <EventFilterToolbar
            initialSearch={search}
            initialStatus={status}
          />
        </div>
      </div>

      {/* 2. Events List Card */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <EventsTableClient
            events={events}
            locale={locale}
          />

          {/* 3. Phân trang */}
          {events.length > 0 && (
            <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/50">
              <EventPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalEvents={totalEvents}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
