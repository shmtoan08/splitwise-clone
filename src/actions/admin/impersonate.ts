"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

const IMPERSONATE_COOKIE = "split_impersonate_user_id";

/**
 * Bắt đầu phiên đăng nhập hỗ trợ (Impersonation) người dùng
 */
export async function startImpersonation(
  targetUserId: string
): Promise<ActionResult> {
  const session = await auth();

  // Kiểm tra quyền ADMIN (cho phép nếu là Admin hoặc đang giữ quyền Admin gốc)
  const isAdmin = session?.user?.role === "ADMIN" || !!session?.user?.originalAdminId;
  if (!session?.user || !isAdmin) {
    throw new Error("UNAUTHORIZED");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    return { success: false, error: "user_not_found" };
  }

  // Không cho phép impersonate tài khoản Admin hoặc chính mình
  const currentAdminId = session.user.originalAdminId || session.user.id;
  if (targetUser.role === "ADMIN" || targetUserId === currentAdminId) {
    return { success: false, error: "cannot_impersonate_admin" };
  }

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 2 * 60 * 60, // 2 giờ
  });

  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

/**
 * Kết thúc phiên đăng nhập hỗ trợ và quay lại tài khoản Admin
 */
export async function stopImpersonation(): Promise<ActionResult> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);

  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}
