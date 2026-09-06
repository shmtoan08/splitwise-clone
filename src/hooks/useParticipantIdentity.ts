"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { syncDeviceTokenToUserParticipant } from "@/actions/participant";
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
 * Hook quản lý danh tính người dùng trong sự kiện (Identity Resolution).
 *
 * Cơ chế ưu tiên:
 * 1. Nếu người dùng ĐÃ ĐĂNG NHẬP (authenticated): Ưu tiên khớp theo User ID (userId).
 *    -> Giúp cùng 1 tài khoản đăng nhập trên bất kỳ thiết bị nào cũng nhận diện được ngay, không bị hiện modal "Bạn là ai".
 * 2. Fallback cho khách vãng lai: Khớp theo deviceToken lưu trong cookie thiết bị.
 * 3. Tự động đồng bộ deviceToken cho thiết bị mới nếu user đã đăng nhập.
 *
 * @param participants - Danh sách participants của event hiện tại
 */
export function useParticipantIdentity(
  participants: Array<{
    id: string;
    name: string;
    deviceToken: string | null;
    userId?: string | null;
  }>
) {
  const { data: session, status } = useSession();
  const params = useParams();
  const eventId = params?.eventId as string | undefined;

  const [identity, setIdentity] = useState<ParticipantIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Nếu session đang tải, giữ trạng thái loading để tránh flash modal
    if (status === "loading") {
      setIsLoading(true);
      return;
    }

    const deviceToken = getCookieValue(DEVICE_TOKEN_COOKIE);

    // Bước 1 (Ưu tiên cao nhất): Nếu đã đăng nhập, tìm theo userId
    if (status === "authenticated" && session?.user?.id) {
      const matchedByUser = participants.find(
        (p) => p.userId === session.user.id && p.name !== "🏢 Quỹ Công ty"
      );

      if (matchedByUser) {
        const effectiveToken = matchedByUser.deviceToken || deviceToken || "";
        setIdentity({
          participantId: matchedByUser.id,
          name: matchedByUser.name,
          deviceToken: effectiveToken,
          isClaimed: true,
        });
        setIsLoading(false);

        // Tự động đồng bộ deviceToken cho trình duyệt mới nếu chưa khớp
        if (eventId && (!deviceToken || deviceToken !== matchedByUser.deviceToken)) {
          syncDeviceTokenToUserParticipant(eventId).catch((err) => {
            console.error("[useParticipantIdentity] sync deviceToken error:", err);
          });
        }
        return;
      }
    }

    // Bước 2 (Fallback cho khách vãng lai hoặc chưa liên kết userId): Tìm theo deviceToken
    if (deviceToken) {
      const matchedByDevice = participants.find(
        (p) => p.deviceToken === deviceToken && p.name !== "🏢 Quỹ Công ty"
      );

      if (matchedByDevice) {
        setIdentity({
          participantId: matchedByDevice.id,
          name: matchedByDevice.name,
          deviceToken,
          isClaimed: true,
        });
        setIsLoading(false);
        return;
      }
    }

    // Không khớp với bất kỳ participant nào
    setIdentity(null);
    setIsLoading(false);
  }, [participants, session?.user?.id, status, eventId]);

  /**
   * Lấy deviceToken từ cookie client-side (dùng để hiển thị UI điều kiện).
   * KHÔNG dùng giá trị này để gọi Server Action — server tự đọc từ cookie.
   */
  const getDeviceToken = useCallback((): string | null => {
    return getCookieValue(DEVICE_TOKEN_COOKIE);
  }, []);

  /**
   * Kiểm tra nhanh xem thiết bị/user hiện tại có phải là participant với id cho trước không.
   */
  const isCurrentParticipant = useCallback(
    (participantId: string): boolean => {
      return !!identity && identity.participantId === participantId;
    },
    [identity]
  );

  return {
    identity,
    isLoading,
    isCurrentParticipant,
    getDeviceToken,
    /**
     * Chỉ cần claim identity khi:
     * 1. Session đã load xong (status !== "loading" và !isLoading)
     * 2. Không nhận diện được participant nào (chưa có identity)
     */
    needsIdentityClaim: !isLoading && status !== "loading" && !identity,
  };
}
