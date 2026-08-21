import { PrismaClient } from "../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma v7 + @prisma/adapter-pg
// - Runtime (Vercel serverless): dùng DATABASE_URL (pooled — PgBouncer / Accelerate)
// - Singleton pattern: tránh tạo nhiều connection khi Next.js hot-reload ở dev
// Tài liệu: https://www.prisma.io/docs/guides/nextjs

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Trong build time (không có DB), trả về client không có adapter
    // Sẽ fail ở runtime nếu DB không có — lỗi rõ ràng thay vì crash lạ
    return new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
