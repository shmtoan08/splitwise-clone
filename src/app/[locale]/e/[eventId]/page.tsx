import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ eventId: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  // TODO: Fetch event title từ DB để đặt title động
  return {
    title: `Sự kiện ${eventId}`,
  };
}

// Trang chi tiết sự kiện — hiển thị thành viên, danh sách chi tiêu
export default async function EventPage({ params }: Props) {
  const { eventId } = await params;
  const t = await getTranslations("event");

  // TODO: getEventById(eventId) — nếu null thì gọi notFound()
  // Placeholder: simulate event not found check
  if (!eventId) notFound();

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("expenses")}</h1>
      {/* TODO: ParticipantList, ExpenseList, AddExpenseButton */}
      <p className="text-gray-400 text-center mt-12">
        Event {eventId} — UI coming soon
      </p>
    </main>
  );
}
