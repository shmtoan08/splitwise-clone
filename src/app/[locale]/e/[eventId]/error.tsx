"use client";

// error.tsx — Error boundary cho Event page
// Hiển thị khi Server Component hoặc Server Action ném lỗi
// PHẢI là Client Component ('use client')

import { useEffect } from "react";
import { useTranslations } from "next-intl";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function EventError({ error, reset }: Props) {
  const t = useTranslations("common");

  useEffect(() => {
    // TODO: Log lỗi lên monitoring service (Sentry, v.v.)
    console.error("[EventError]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold mb-2">{t("error")}</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        {error.message || "Đã xảy ra lỗi không mong muốn."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Thử lại
      </button>
    </main>
  );
}
