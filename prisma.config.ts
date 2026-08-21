import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma v7 config
// Tài liệu: https://pris.ly/d/config-datasource
//
// - datasource.url: dùng DIRECT_URL cho Migrate (bỏ qua pooler)
// - Trong runtime (PrismaClient): dùng DATABASE_URL (pooled) qua @prisma/adapter-pg
//   → Xem src/lib/prisma.ts

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // seed: `tsx prisma/seed.ts`, // Uncomment khi có seed file
  },
  datasource: {
    // DIRECT_URL: kết nối trực tiếp (bỏ qua pooler) — dùng cho migrate
    // DATABASE_URL (pooled) được dùng ở src/lib/prisma.ts qua adapter
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
