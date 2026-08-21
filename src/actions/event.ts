"use server";

// TODO: Implement event Server Actions
// - createEvent(data): Tạo sự kiện mới, trả về eventId (UUID)
// - getEventById(eventId): Lấy thông tin sự kiện + participants + expenses

import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Placeholder — sẽ implement ở Phase 1 sprint tiếp theo
export async function createEvent(_data: unknown) {
  // TODO: validate với event.schema.ts, gọi prisma.event.create
  void prisma;
  void z;
  throw new Error("Not implemented yet");
}

export async function getEventById(_eventId: string) {
  // TODO: prisma.event.findUnique với select cụ thể (không dùng include: true mặc định)
  throw new Error("Not implemented yet");
}
