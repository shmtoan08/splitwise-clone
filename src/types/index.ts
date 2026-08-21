/**
 * types/index.ts — Các type dùng chung không map trực tiếp vào DB schema
 *
 * Các type từ Prisma (DB models) import trực tiếp từ "@prisma/client".
 * File này chứa type cho kết quả tính toán, props component, và API response.
 */

import type { DebtTransaction } from "@/utils/algorithm";

// Re-export để các file khác có thể import từ 1 chỗ
export type { SplitResult, Balance, DebtTransaction, ShareInput } from "@/utils/algorithm";

// ---------------------------------------------------------------------------
// Settlement summary — kết quả từ getSettlementSummary()
// ---------------------------------------------------------------------------

export type SettlementSummaryItem = DebtTransaction & {
  /** Tên người nợ (hiển thị UI) */
  fromName: string;
  /** Tên người được nợ (hiển thị UI) */
  toName: string;
  /** Settlement record ID nếu đã tồn tại trong DB */
  settlementId?: string;
  /** Trạng thái hiện tại nếu đã có Settlement record */
  status?: "PENDING" | "MARKED_PAID" | "CONFIRMED";
};

// ---------------------------------------------------------------------------
// Server Action response pattern
// ---------------------------------------------------------------------------

/** Generic response type cho Server Actions — dùng thống nhất trên toàn app */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Participant identity
// ---------------------------------------------------------------------------

/**
 * Identity của người dùng hiện tại trong 1 event cụ thể.
 * Được đọc từ cookie + DB bởi useParticipantIdentity hook.
 */
export type ParticipantIdentity = {
  participantId: string;
  name: string;
  /** deviceToken hiện tại trên thiết bị này */
  deviceToken: string;
  /** Đã claim identity chưa (đã chọn tên và được gắn deviceToken) */
  isClaimed: boolean;
};

// ---------------------------------------------------------------------------
// Recent event — lưu trong LocalStorage
// ---------------------------------------------------------------------------

/** Entry lưu vào LocalStorage cho tính năng "Nhóm gần đây" */
export type RecentEvent = {
  id: string; // UUID của Event
  title: string;
  /** Timestamp lần truy cập cuối (ms) */
  lastVisitedAt: number;
};
