"use server";

// TODO: Implement participant Server Actions
// - addParticipant(data): Thêm thành viên vào event
// - removeParticipant(participantId): Xoá thành viên (và các splits liên quan)
// - claimParticipantIdentity(participantId, deviceToken):
//     Gắn deviceToken vào Participant khi người dùng chọn tên lần đầu.
//     deviceToken phải được lưu vào cookie phía server, không tin giá trị từ client.

import { prisma } from "@/lib/prisma";

export async function addParticipant(_data: unknown) {
  void prisma;
  throw new Error("Not implemented yet");
}

export async function removeParticipant(_participantId: string) {
  throw new Error("Not implemented yet");
}

/**
 * Gắn deviceToken vào Participant — "soft identity" không cần đăng nhập.
 * deviceToken được sinh ngẫu nhiên ở server (crypto.randomUUID()), lưu vào
 * httpOnly cookie trên thiết bị người dùng, và gắn vào Participant.deviceToken.
 */
export async function claimParticipantIdentity(
  _participantId: string,
  _eventId: string
) {
  // TODO:
  // 1. Đọc deviceToken hiện tại từ httpOnly cookie
  // 2. Nếu chưa có: sinh mới crypto.randomUUID(), set cookie
  // 3. Kiểm tra deviceToken chưa bị participant khác dùng trong event này
  // 4. prisma.participant.update({ where: { id }, data: { deviceToken } })
  throw new Error("Not implemented yet");
}
