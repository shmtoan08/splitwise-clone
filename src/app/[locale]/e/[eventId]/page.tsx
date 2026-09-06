import { getEventById } from "@/actions/event";
import { notFound } from "next/navigation";
import EventTabsClient from "@/components/event/EventTabsClient";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

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

  const session = await auth();
  const userParticipant = session?.user?.id
    ? event.participants.find((p) => p.userId === session.user.id)
    : null;

  const isCreator = !!(
    (deviceToken && event.creatorDeviceToken === deviceToken) ||
    (userParticipant && userParticipant.deviceToken && userParticipant.deviceToken === event.creatorDeviceToken)
  );

  return <EventTabsClient event={event} isCreator={isCreator} />;
}
