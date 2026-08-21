import { useTranslations } from "next-intl";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Không tìm thấy nhóm",
};

// not-found.tsx — Hiển thị khi eventId không tồn tại trong DB hoặc đã bị xoá
export default function EventNotFound() {
  const t = useTranslations();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="text-8xl mb-6">🔍</div>
      <h1 className="text-3xl font-bold mb-3">{t("common.notFound")}</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        {t("errors.eventNotFound")}
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {t("common.back")} → Trang chủ
      </Link>
    </main>
  );
}
