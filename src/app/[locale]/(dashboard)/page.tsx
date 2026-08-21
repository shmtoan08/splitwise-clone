import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Dashboard — trang tổng hợp nhóm đã tham gia (Phase 3, cần đăng nhập)
export default async function DashboardPage() {
  const t = await getTranslations("event");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("members")}</h1>
      {/* TODO: Danh sách Event đã tham gia — fetch từ DB theo userId */}
      <p className="text-gray-400">Dashboard — Phase 3 (coming soon)</p>
    </div>
  );
}
