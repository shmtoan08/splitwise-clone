
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@wari.app";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
  const adminName = "System Admin";

   const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      password: hashedPassword,
      emailVerified: new Date(), // BẮT BUỘC: phải có emailVerified để NextAuth cho phép đăng nhập
    },
    create: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  console.log("✅ Seed Admin user successfully:");
  console.log({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    emailVerified: admin.emailVerified,
  });
  console.log(`\n🔑 Thông tin đăng nhập:\n- Email: ${adminEmail}\n- Mật khẩu: ${adminPassword}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
