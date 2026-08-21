// layout.tsx — Layout dùng chung cho Event detail pages
// Hiển thị header với tên nhóm (fetch từ DB), wrap các sub-pages

type Props = {
  children: React.ReactNode;
  params: Promise<{ eventId: string; locale: string }>;
};

export default async function EventLayout({ children, params }: Props) {
  const { eventId } = await params;

  // TODO: Fetch event title từ DB để hiển thị trong header
  // const event = await getEventById(eventId);
  // if (!event) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TODO: EventHeader component — tên nhóm, nút share, nút chốt sổ */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <span className="font-semibold text-gray-700">
          Nhóm: {eventId.slice(0, 8)}...
        </span>
      </header>
      <div>{children}</div>
    </div>
  );
}
