import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ eventId: string }>;
};

export const metadata: Metadata = {
  title: "Chốt sổ",
};

// Trang chốt sổ — hiển thị ai nợ ai, VietQR, PayPay link
// Server Component: tính toán settlement trên server, không expose logic ra client
export default async function SettlementPage({ params }: Props) {
  const { eventId } = await params;
  const t = await getTranslations("settlement");

  // TODO: getSettlementSummary(eventId) từ actions/settlement.ts
  // Kết quả: danh sách DebtTransaction từ simplifyDebts()

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t("allSettled")}</h1>
      {/* TODO: SettlementList, VietQR, PayPayLink components */}
      <p className="text-gray-400 text-center mt-8">
        Settlement for event {eventId} — Coming soon
      </p>
    </main>
  );
}
