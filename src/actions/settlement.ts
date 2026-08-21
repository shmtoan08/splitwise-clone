"use server";

// TODO: Implement settlement Server Actions
//
// QUAN TRỌNG: Xác nhận thanh toán BẮT BUỘC qua đúng 2 bước tách biệt:
// 1. markAsPaid()     — A (con nợ) gọi, chuyển PENDING → MARKED_PAID
// 2. confirmReceived() — B (chủ nợ) gọi, chuyển MARKED_PAID → CONFIRMED
//
// Cả 2 hàm đều phải:
// - Đọc deviceToken từ httpOnly cookie phía SERVER (không tin client gửi lên)
// - Verify deviceToken khớp với Participant tương ứng (from/to)
// - Verify Settlement.status đang ở đúng trạng thái trước khi chuyển
//
// CẤM tạo hàm nào set status = CONFIRMED trực tiếp từ 1 action duy nhất.

import { prisma } from "@/lib/prisma";
import { calculateBalances, simplifyDebts } from "@/utils/algorithm";

/**
 * Tính danh sách nợ tối giản cho 1 event.
 * Gọi calculateBalances + simplifyDebts từ utils/algorithm.ts.
 */
export async function getSettlementSummary(_eventId: string) {
  // TODO:
  // 1. Lấy participants + expenses (với splits) từ DB (dùng select cụ thể)
  // 2. calculateBalances(participantIds, expenses)
  // 3. simplifyDebts(balances)
  // 4. Map kết quả sang Settlement records (hoặc return raw transactions cho UI)
  void prisma;
  void calculateBalances;
  void simplifyDebts;
  throw new Error("Not implemented yet");
}

/**
 * A (người nợ) bấm "Đã chuyển tiền" → PENDING → MARKED_PAID
 * Validate: deviceToken của caller phải khớp Settlement.from.deviceToken
 */
export async function markAsPaid(_settlementId: string) {
  // TODO: đọc cookie → verify fromId → updateMany với where { id, status: PENDING }
  throw new Error("Not implemented yet");
}

/**
 * B (người nhận) bấm "Đã nhận được" → MARKED_PAID → CONFIRMED
 * Validate: deviceToken của caller phải khớp Settlement.to.deviceToken
 */
export async function confirmReceived(_settlementId: string) {
  // TODO: đọc cookie → verify toId → updateMany với where { id, status: MARKED_PAID }
  //       Set confirmedAt = new Date() cùng lúc
  throw new Error("Not implemented yet");
}
