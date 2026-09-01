import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AlertProvider } from "@/providers/AlertProvider";
import { SessionProvider } from "next-auth/react";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });
  
  return {
    title: {
      template: `%s | ${t('name')}`,
      default: t('layoutTitle'),
    },
    description: t('description'),
  };
}


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
        <SessionProvider>
          <NextIntlClientProvider messages={messages}>
            <AlertProvider>
              {children}
            </AlertProvider>
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
