import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // 1. Bảo mật: Xác thực header Authorization từ Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 2. Tính toán các mốc thời gian dọn dẹp
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // 3. Thực thi xóa các sự kiện theo 2 nhóm điều kiện
    const result = await prisma.event.deleteMany({
      where: {
        OR: [
          // Nhóm 1: Sự kiện rỗng (không có khoản chi nào) tạo hơn 14 ngày trước
          {
            createdAt: { lt: fourteenDaysAgo },
            expenses: {
              none: {},
            },
          },
          // Nhóm 2: Sự kiện ẩn danh (100% thành viên không ai liên kết tài khoản) không tương tác hơn 90 ngày
          {
            updatedAt: { lt: ninetyDaysAgo },
            participants: {
              none: {
                userId: { not: null },
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.count} abandoned event(s).`,
      deletedCount: result.count,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[Cron Cleanup] Error during garbage collection:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
