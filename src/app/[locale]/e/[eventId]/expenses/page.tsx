import { getEventById } from "@/actions/event";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import ExpenseTab from "@/components/event/ExpenseTab";

type Props = {
  params: Promise<{ eventId: string; locale: string }>;
};

export default async function ExpensesPage({ params }: Props) {
  const { eventId } = await params;

  const event = await getEventById(eventId);
  
  if (!event) {
    notFound();
  }

  const cookieStore = await cookies();
  const localeCurrency = cookieStore.get("NEXT_LOCALE_CURRENCY")?.value;
  const currency = localeCurrency || event.currency;

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4">
      <ExpenseTab 
        eventId={event.id}
        participants={event.participants}
        expenses={event.expenses}
        currency={currency}
      />
    </div>
  );
}
