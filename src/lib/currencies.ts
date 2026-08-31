export const SUPPORTED_CURRENCIES = [
  { code: "VND", symbol: "₫", label: "Việt Nam Đồng (VND)" },
  { code: "JPY", symbol: "¥", label: "Nhật Bản Yên (JPY)" },
  { code: "USD", symbol: "$", label: "Đô la Mỹ (USD)" },
  { code: "EUR", symbol: "€", label: "Euro (EUR)" },
  { code: "SGD", symbol: "S$", label: "Đô la Singapore (SGD)" },
  { code: "THB", symbol: "฿", label: "Baht Thái (THB)" },
  { code: "KRW", symbol: "₩", label: "Won Hàn Quốc (KRW)" },
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]["code"];

/**
 * Tự động phát hiện đơn vị tiền tệ khởi tạo dựa theo vị trí địa lý / múi giờ / ngôn ngữ của người dùng.
 * 
 * Ưu tiên:
 * 1. Timezone của trình duyệt (Intl.DateTimeFormat) -> chính xác vị trí vật lý / múi giờ thiết bị
 * 2. Ngôn ngữ trình duyệt (navigator.language)
 * 3. Locale trang hiện tại (vi / ja)
 * 4. Fallback mặc định: VND
 */
export function detectCurrencyFromLocation(locale?: string): string {
  if (typeof window === "undefined") {
    if (locale === "ja") return "JPY";
    return "VND";
  }

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    
    // 1. Kiểm tra Múi giờ thiết bị (Timezone)
    if (timeZone.includes("Tokyo") || timeZone.includes("Osaka") || timeZone === "Japan") {
      return "JPY";
    }
    if (
      timeZone.includes("Ho_Chi_Minh") ||
      timeZone.includes("Saigon") ||
      timeZone.includes("Hanoi")
    ) {
      return "VND";
    }
    if (timeZone.includes("Seoul") || timeZone.includes("Korea") || timeZone === "ROK") {
      return "KRW";
    }
    if (timeZone.includes("Singapore")) {
      return "SGD";
    }
    if (timeZone.includes("Bangkok") || timeZone.includes("Phnom_Penh") || timeZone.includes("Vientiane")) {
      // Nếu ở múi giờ GMT+7 nhưng ngôn ngữ là tiếng Việt -> chọn VND
      const navLang = (navigator.language || "").toLowerCase();
      if (navLang.startsWith("vi") || locale === "vi") {
        return "VND";
      }
      return "THB";
    }
    if (timeZone.startsWith("Europe/")) {
      return "EUR";
    }
    if (
      timeZone.startsWith("America/") ||
      timeZone.startsWith("US/") ||
      timeZone.startsWith("Canada/") ||
      timeZone.includes("Honolulu")
    ) {
      return "USD";
    }

    // 2. Kiểm tra Ngôn ngữ trình duyệt (Browser Language)
    const browserLang = (navigator.language || "").toLowerCase();
    if (browserLang.startsWith("ja")) return "JPY";
    if (browserLang.startsWith("vi")) return "VND";
    if (browserLang.startsWith("ko")) return "KRW";
    if (browserLang.startsWith("th")) return "THB";
    if (browserLang.includes("sg")) return "SGD";
    if (browserLang.startsWith("en-us") || browserLang.startsWith("en-ca")) return "USD";
    if (["fr", "de", "it", "es", "nl", "pt", "el"].some((lang) => browserLang.startsWith(lang))) {
      return "EUR";
    }

    // 3. Fallback theo Locale của trang web
    if (locale === "ja") return "JPY";
    if (locale === "vi") return "VND";
  } catch (error) {
    console.error("[detectCurrencyFromLocation] Error detecting location currency:", error);
  }

  return "VND";
}
