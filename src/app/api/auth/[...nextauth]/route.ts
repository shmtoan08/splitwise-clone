// Route Handler cho NextAuth.js
// Xử lý tất cả các route auth: /api/auth/signin, /callback, /signout, v.v.

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
