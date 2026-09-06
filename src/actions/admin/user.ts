"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export interface AdminUserItem {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  role: "USER" | "ADMIN";
  image: string | null;
  createdAt: Date;
  _count: {
    participants: number;
  };
}

export interface GetAdminUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface GetAdminUsersResult {
  users: AdminUserItem[];
  totalUsers: number;
  currentPage: number;
  totalPages: number;
}

export async function getAdminUsers({
  page = 1,
  pageSize = 10,
  search = "",
}: GetAdminUsersParams = {}): Promise<GetAdminUsersResult> {
  await requireAdmin();

  const currentPage = Math.max(1, page);
  const skip = (currentPage - 1) * pageSize;
  const trimmedSearch = search.trim();

  const where = trimmedSearch
    ? {
        OR: [
          {
            email: {
              contains: trimmedSearch,
              mode: "insensitive" as const,
            },
          },
          {
            name: {
              contains: trimmedSearch,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            participants: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  return {
    users: users as AdminUserItem[],
    totalUsers,
    currentPage,
    totalPages,
  };
}

export async function adminVerifyUserEmail(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: "USER_NOT_FOUND" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[adminVerifyUserEmail] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}

export async function updateUserRole(
  userId: string,
  newRole: "USER" | "ADMIN"
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await requireAdmin();

    if (adminUser.id === userId) {
      throw new Error("CANNOT_CHANGE_OWN_ROLE");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[updateUserRole] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}

export async function adminDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await requireAdmin();

    if (adminUser.id === userId) {
      throw new Error("CANNOT_DELETE_SELF");
    }

    await prisma.$transaction(async (tx) => {
      // 1. Gán userId: null cho các participant để bảo toàn lịch sử kế toán các nhóm
      await tx.participant.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // 2. Xóa user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("[adminDeleteUser] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}

export async function adminBulkVerifyEmails(
  userIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    await requireAdmin();

    if (!userIds.length) {
      return { success: true, count: 0 };
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { emailVerified: new Date() },
    });

    revalidatePath("/admin/users");
    return { success: true, count: result.count };
  } catch (error) {
    console.error("[adminBulkVerifyEmails] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}

export async function adminBulkDeleteUsers(
  userIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const adminUser = await requireAdmin();

    // Lọc bỏ ID của chính admin đang thao tác
    const targetIds = userIds.filter((id) => id !== adminUser.id);

    if (targetIds.length === 0) {
      return { success: false, error: "CANNOT_DELETE_SELF" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Gán userId: null cho các participant liên quan để bảo toàn kế toán
      await tx.participant.updateMany({
        where: { userId: { in: targetIds } },
        data: { userId: null },
      });

      // 2. Xóa các user
      await tx.user.deleteMany({
        where: { id: { in: targetIds } },
      });
    });

    revalidatePath("/admin/users");
    return { success: true, count: targetIds.length };
  } catch (error) {
    console.error("[adminBulkDeleteUsers] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "SYSTEM_ERROR" };
  }
}

