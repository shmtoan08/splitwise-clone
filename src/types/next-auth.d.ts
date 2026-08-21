import "next-auth";

// Augment NextAuth types để thêm id vào Session.user
// Tham khảo: https://authjs.dev/getting-started/typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
