import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

/**
 * middleware.ts — CHỈ xử lý i18n redirect
 *
 * KHÔNG gánh thêm auth check ở đây.
 * Auth check nằm ở src/app/[locale]/(dashboard)/layout.tsx
 * để tránh xung đột giữa next-intl và next-auth middleware.
 */
export default createMiddleware(routing);

export const config = {
  // Match tất cả các route trừ: _next, api, static files, favicon
  matcher: [
    "/((?!_next|api|_vercel|.*\\..*).*)",
    "/",
  ],
};
