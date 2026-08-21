import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// NextAuth v5 config
// Tài liệu: https://authjs.dev/getting-started/installation?framework=next.js
//
// Phase 3 — Auth: Google OAuth để lưu lịch sử, "Claim Event"
// Hiện tại chỉ cần providers khai báo để middleware + route handler hoạt động

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // TODO: session callback — gắn userId vào session để dùng trong Server Actions
    // TODO: "Claim Event" logic — sau khi đăng nhập, gắn sự kiện ẩn danh vào account
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // Redirect về trang chủ thay vì trang login mặc định của NextAuth
  },
});
