"use client";

import { useEffect } from "react";
import { useRecentEvents } from "@/hooks/useRecentEvents";

type Props = {
  eventId: string;
  title: string;
};

export default function RecentEventTracker({ eventId, title }: Props) {
  const { addRecentEvent } = useRecentEvents();

  useEffect(() => {
    addRecentEvent({ id: eventId, title });
  }, [eventId, title, addRecentEvent]);

  return null;
}
