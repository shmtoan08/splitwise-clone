import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getAdminUsers } from "@/actions/admin/user";
import { Card, CardContent } from "@/components/ui/card";
import { UserSearchBar } from "@/components/admin/UserSearchBar";
import { UserPagination } from "@/components/admin/UserPagination";
import { UsersTableClient } from "@/components/admin/UsersTableClient";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adminUsers" });
  return {
    title: `${t("title")} | Wari Admin`,
    description: t("description"),
  };
}

interface AdminUsersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const t = await getTranslations("adminUsers");
  const locale = await getLocale();
  const session = await auth();

  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page || "1", 10) || 1;
  const search = resolvedSearchParams.search || "";

  const { users, totalUsers, currentPage, totalPages } = await getAdminUsers({
    page,
    pageSize: 10,
    search,
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t("title")}</span>
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            {t("description")}
          </p>
        </div>

        <div className="w-full md:w-auto">
          <UserSearchBar initialSearch={search} />
        </div>
      </div>

      {/* 2. User List Card */}
      <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <UsersTableClient
            users={users}
            currentUserId={session?.user?.id}
            locale={locale}
          />

          {/* 3. Phân trang */}
          {users.length > 0 && (
            <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/50">
              <UserPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalUsers={totalUsers}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
