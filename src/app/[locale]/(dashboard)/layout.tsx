// layout.tsx — (dashboard) Route Group
// Auth check nằm Ở ĐÂY — không gộp vào middleware.ts
// Middleware chỉ lo i18n redirect để tránh xung đột

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

export default async function DashboardLayout({ children }: Props) {
  const session = await auth();

  // Nếu chưa đăng nhập, redirect về trang chủ
  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TODO: DashboardNav — user avatar, đăng xuất, link về trang chủ */}
      <nav className="bg-white border-b px-6 py-3">
        <span className="font-semibold">
          {session.user?.name ?? "Dashboard"}
        </span>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
