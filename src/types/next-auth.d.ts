import { DefaultSession } from "next-auth";

export type UserRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isImpersonated?: boolean;
      originalAdminId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    isImpersonated?: boolean;
    originalAdminId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    name?: string | null;
  }
}

