"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type Props = {
  paypayLink: string;
  amount: number;
  currency?: string;
};

export default function PayPayLink({ paypayLink, amount, currency = "JPY" }: Props) {
  const t = useTranslations("settlement");

  return (
    <a
      href={paypayLink}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex"
    >
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        {/* PayPay logo color: red */}
        <span className="font-bold text-xs">Pay</span>
        <ExternalLink className="w-3 h-3" />
        {t("openPayPay")}
      </Button>
    </a>
  );
}
