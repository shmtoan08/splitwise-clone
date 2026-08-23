import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Chia Tiền Nhóm",
    default: "Chia Tiền Nhóm — Splitwise Clone",
  },
  description:
    "Ứng dụng chia tiền nhóm miễn phí. Không cần đăng nhập. Hỗ trợ tiếng Việt và tiếng Nhật.",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale hợp lệ
  if (!routing.locales.includes(locale as "vi" | "ja")) {
    notFound();
  }

  // Load messages cho locale hiện tại
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
