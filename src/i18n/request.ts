import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // Lấy locale từ request (đã được middleware xử lý)
  let locale = await requestLocale;

  // Fallback về defaultLocale nếu locale không hợp lệ
  if (!locale || !routing.locales.includes(locale as "vi" | "ja")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (
      await import(`./messages/${locale}.json`)
    ).default,
    onError(error) {
      if (error.code === "MISSING_MESSAGE") {
        console.warn(error.message);
      } else {
        console.error(error);
      }
    },
    getMessageFallback({ key, namespace }) {
      const nestedKey = namespace ? `${namespace}.${key}` : key;
      return nestedKey;
    },
  };
});
