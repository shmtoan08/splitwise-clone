"use client";

import { useState, useCallback } from "react";
import type { RecentEvent } from "@/types";

const STORAGE_KEY = "split-app:recent-events";
const MAX_RECENT = 10;

/**
 * Hook đọc/ghi danh sách Event đã truy cập gần đây vào LocalStorage.
 *
 * - Tự động sort theo thời gian truy cập gần nhất
 * - Giới hạn MAX_RECENT entries (xoá cũ nhất khi vượt quá)
 * - SSR-safe: check typeof window trước khi access localStorage
 */
export function useRecentEvents() {
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as RecentEvent[];
      return parsed.sort((a, b) => b.lastVisitedAt - a.lastVisitedAt);
    } catch {
      return [];
    }
  });

  /**
   * Thêm hoặc cập nhật 1 event vào danh sách recent.
   * Nếu event đã tồn tại → cập nhật lastVisitedAt.
   */
  const addRecentEvent = useCallback((event: Omit<RecentEvent, "lastVisitedAt">) => {
    setRecentEvents((prev) => {
      const now = Date.now();
      const filtered = prev.filter((e) => e.id !== event.id);
      const updated: RecentEvent[] = [
        { ...event, lastVisitedAt: now },
        ...filtered,
      ].slice(0, MAX_RECENT);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage đầy hoặc không khả dụng — bỏ qua
      }

      return updated;
    });
  }, []);

  /** Xoá 1 event khỏi danh sách recent */
  const removeRecentEvent = useCallback((eventId: string) => {
    setRecentEvents((prev) => {
      const updated = prev.filter((e) => e.id !== eventId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  return { recentEvents, addRecentEvent, removeRecentEvent };
}
