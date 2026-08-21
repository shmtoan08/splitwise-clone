"use client";

import { useState, useEffect, useCallback } from "react";
import type { ParticipantIdentity } from "@/types";

const DEVICE_TOKEN_COOKIE = "split-app-device-token";

/**
 * Đọc cookie theo tên từ document.cookie (client-side only).
 * Trả về null nếu không tìm thấy.
 */
function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/**
 * Hook quản lý "soft identity" — biết mình là participant nào trong event hiện tại.
 *
 * Flow:
 * 1. Đọc deviceToken từ cookie trên thiết bị
 * 2. So sánh với participants của event (từ props)
 * 3. Nếu khớp → tự động nhận diện "bạn là X"
 * 4. Nếu chưa có token → hiển thị modal "Bạn là ai?"
 *
 * NOTE: deviceToken trong cookie chỉ dùng để đọc ở client.
 * Mọi thao tác nhạy cảm (markAsPaid, confirmReceived) đều validate token từ cookie
 * phía SERVER trong Server Action — không tin giá trị gửi từ client.
 *
 * @param participants - Danh sách participants của event hiện tại
 */
export function useParticipantIdentity(
  participants: Array<{ id: string; name: string; deviceToken: string | null }>
) {
  const [identity, setIdentity] = useState<ParticipantIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const deviceToken = getCookieValue(DEVICE_TOKEN_COOKIE);

    if (!deviceToken) {
      setIsLoading(false);
      return;
    }

    // Tìm participant khớp deviceToken trên thiết bị này
    const matched = participants.find((p) => p.deviceToken === deviceToken);

    if (matched) {
      setIdentity({
        participantId: matched.id,
        name: matched.name,
        deviceToken,
        isClaimed: true,
      });
    }

    setIsLoading(false);
  }, [participants]);

  /**
   * Lấy deviceToken từ cookie client-side (dùng để hiển thị UI điều kiện).
   * KHÔNG dùng giá trị này để gọi Server Action — server tự đọc từ cookie.
   */
  const getDeviceToken = useCallback((): string | null => {
    return getCookieValue(DEVICE_TOKEN_COOKIE);
  }, []);

  /**
   * Kiểm tra nhanh xem thiết bị hiện tại có phải là participant với id cho trước không.
   * Dùng để ẩn/hiện nút action (markAsPaid, confirmReceived) ở UI.
   *
   * QUAN TRỌNG: Đây chỉ là UI hint, KHÔNG phải security check.
   * Security check thật sự xảy ra ở Server Action.
   */
  const isCurrentParticipant = useCallback(
    (participantId: string): boolean => {
      return identity?.participantId === participantId;
    },
    [identity]
  );

  return {
    identity,
    isLoading,
    isCurrentParticipant,
    getDeviceToken,
    /** Chưa claim identity (chưa chọn tên trên thiết bị này) */
    needsIdentityClaim: !isLoading && !identity,
  };
}
