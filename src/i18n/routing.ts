import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Danh sách locale được hỗ trợ
  locales: ["vi", "ja"],

  // Locale mặc định khi không có prefix trên URL
  defaultLocale: "vi",

  // Bỏ prefix cho locale mặc định (vi)
  // → /vi/e/xxx sẽ trở thành /e/xxx, nhưng /ja/e/xxx vẫn giữ nguyên
  localePrefix: "as-needed",
});
