import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const IMPERSONATE_COOKIE = "split_impersonate_user_id";

/**
 * API route kết thúc phiên hỗ trợ (stop impersonation).
 * Dùng endpoint URL cố định thay vì Server Action thuần túy để tránh lỗi:
 * "Failed to find Server Action ... This request might be from an older or newer deployment."
 * khi Next.js recompile trong quá trình phát triển (HMR) hoặc triển khai bản mới.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATE_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Stop Impersonation] Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE() {
  return POST();
}
