import { getEventById } from "@/actions/event";
import { notFound } from "next/navigation";
import EventTabsClient from "@/components/event/EventTabsClient";
import { cookies } from "next/headers";

type Props = {
  params: Promise<{ eventId: string; locale: string }>;
};

export default async function EventPage({ params }: Props) {
  const { eventId } = await params;

  const event = await getEventById(eventId);
  
  if (!event) {
    notFound();
  }

  const cookieStore = await cookies();
  const deviceToken = cookieStore.get("split-app-device-token")?.value;
  const isCreator = !!(deviceToken && event.creatorDeviceToken === deviceToken);

  return <EventTabsClient event={event} isCreator={isCreator} />;
}
