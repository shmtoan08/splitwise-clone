"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createGroupSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1, "Tên nhóm không được để trống").max(50, "Tên nhóm quá dài").trim(),
  participantIds: z.array(z.string().cuid()).min(1, "Nhóm phải có ít nhất 1 thành viên"),
});

const updateGroupSchema = z.object({
  groupId: z.string().cuid(),
  eventId: z.string().uuid(),
  name: z.string().min(1, "Tên nhóm không được để trống").max(50, "Tên nhóm quá dài").trim(),
  participantIds: z.array(z.string().cuid()).min(1, "Nhóm phải có ít nhất 1 thành viên"),
});

export async function createGroup(data: unknown) {
  const parsed = createGroupSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const { eventId, name, participantIds } = parsed.data;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLocked: true },
    });
    if (event?.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa." };
    }

    await prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          eventId,
          name,
        }
      });
      
      const memberData = participantIds.map((id) => ({
        groupId: group.id,
        participantId: id,
      }));

      await tx.groupMember.createMany({
        data: memberData,
      });
    });

    revalidatePath(`/e/${parsed.data.eventId}`);
    return { success: true };
  } catch (error) {
    console.error("[createGroup] error:", error);
    return { success: false, error: "Lỗi hệ thống khi tạo nhóm" };
  }
}

export async function updateGroup(data: unknown) {
  const parsed = updateGroupSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const { groupId, eventId, name, participantIds } = parsed.data;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLocked: true },
    });
    if (event?.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa." };
    }

    await prisma.$transaction(async (tx) => {
      // Đổi tên
      await tx.group.update({
        where: { id: groupId },
        data: { name },
      });

      // Xoá thành viên cũ
      await tx.groupMember.deleteMany({
        where: { groupId },
      });

      // Thêm thành viên mới
      const memberData = participantIds.map((id) => ({
        groupId,
        participantId: id,
      }));

      await tx.groupMember.createMany({
        data: memberData,
      });
    });

    revalidatePath(`/e/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("[updateGroup] error:", error);
    return { success: false, error: "Lỗi hệ thống khi sửa nhóm" };
  }
}

export async function deleteGroup(groupId: string, eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { isLocked: true },
    });
    if (event?.isLocked) {
      return { success: false, error: "Sự kiện đã bị khóa." };
    }

    await prisma.group.delete({
      where: { id: groupId },
    });
    
    revalidatePath(`/e/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("[deleteGroup] error:", error);
    return { success: false, error: "Lỗi hệ thống khi xoá nhóm" };
  }
}
