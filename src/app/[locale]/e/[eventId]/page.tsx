import { getEventById } from "@/actions/event";
import { notFound } from "next/navigation";
import EventTabsClient from "@/components/event/EventTabsClient";

type Props = {
  params: Promise<{ eventId: string; locale: string }>;
};

export default async function EventPage({ params }: Props) {
  const { eventId } = await params;

  const event = await getEventById(eventId);
  
  if (!event) {
    notFound();
  }

  return <EventTabsClient event={event} />;
}
