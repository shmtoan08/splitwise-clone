import { useTranslations } from "next-intl";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tạo nhóm chia tiền",
};

// Trang chủ: tạo nhóm mới + hiển thị nhóm gần đây (từ LocalStorage)
// Server Component — data fetching không cần ở đây, localStorage đọc ở client
export default function HomePage() {
  // TODO: Render CreateEventForm (Client Component dùng useTranslations)
  // TODO: Render RecentEventsList (Client Component đọc localStorage)
  return <HomePageContent />;
}

// Placeholder — sẽ được thay bằng component thật
function HomePageContent() {
  const t = useTranslations();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-4">{t("app.name")}</h1>
      <p className="text-gray-500 mb-8">{t("app.tagline")}</p>
      {/* TODO: Form tạo nhóm */}
      <div className="w-full max-w-md border rounded-lg p-6">
        <p className="text-center text-gray-400">
          {t("home.createGroup")} — Coming soon
        </p>
      </div>
    </main>
  );
}
