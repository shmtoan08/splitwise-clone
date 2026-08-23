import { getEventById } from "@/actions/event";
import { notFound } from "next/navigation";
import ParticipantList from "@/components/event/ParticipantList";
import RecentEventTracker from "@/components/event/RecentEventTracker";

type Props = {
  params: Promise<{ eventId: string; locale: string }>;
};

export default async function EventPage({ params }: Props) {
  const { eventId } = await params;

  const event = await getEventById(eventId);
  
  if (!event) {
    notFound();
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <RecentEventTracker eventId={event.id} title={event.title} />
      <ParticipantList eventId={event.id} participants={event.participants} />
    </div>
  );
}
