import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { LoginSchema } from "@/schemas/auth.schema";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);

        if (!parsed.success) {
          console.warn("[auth][authorize] Invalid input format:", parsed.error.format());
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.warn(`[auth][authorize] User not found with email: ${email}`);
          return null;
        }

        if (!user.password) {
          console.warn(`[auth][authorize] User ${email} does not have a password set (OAuth login?).`);
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
          console.warn(`[auth][authorize] Password mismatch for ${email}. Note: password must be hashed with bcrypt.`);
          return null;
        }

        if (!user.emailVerified) {
          console.warn(`[auth][authorize] User ${email} has not verified email (emailVerified is null).`);
          throw new EmailNotVerifiedError();
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = (user as any).role || "USER";
        token.email = user.email;
      } else {
        const userId = (token.id as string) || (token.sub as string);
        if (userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, name: true, email: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            if (dbUser.name) {
              token.name = dbUser.name;
            }
            if (dbUser.email) {
              token.email = dbUser.email;
            }
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.role = (token.role as "USER" | "ADMIN") || "USER";
        const resolvedName = (token.name as string) || (token.email ? (token.email as string).split("@")[0] : "");
        if (resolvedName) {
          session.user.name = resolvedName;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }

        // Hỗ trợ Admin impersonation: đăng nhập dưới tư cách người dùng để hỗ trợ
        if (token.role === "ADMIN") {
          try {
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            const impersonatedUserId = cookieStore.get("split_impersonate_user_id")?.value;

            if (impersonatedUserId) {
              const targetUser = await prisma.user.findUnique({
                where: { id: impersonatedUserId },
                select: { id: true, name: true, email: true, role: true },
              });

              if (targetUser) {
                session.user.id = targetUser.id;
                session.user.name = targetUser.name;
                session.user.email = targetUser.email || "";
                session.user.role = targetUser.role;
                session.user.isImpersonated = true;
                session.user.originalAdminId = (token.id as string) || (token.sub as string);
              }
            }
          } catch {
            // Không ngắt luồng nếu cookies() không có sẵn trong context hiện tại
          }
        }
      }
      return session;
    },
  },
});
