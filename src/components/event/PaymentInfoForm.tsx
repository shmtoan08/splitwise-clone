"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POPULAR_BANKS } from "@/lib/vietqr";
import { updatePaymentInfo } from "@/actions/participant";
import { Loader2, CreditCard, Smartphone } from "lucide-react";

type Props = {
  eventId: string;
  currentPaymentInfo?: {
    bankBIN: string | null;
    accountNumber: string | null;
    accountName: string | null;
    paypayLink: string | null;
  } | null;
  onSuccess?: () => void;
};

export default function PaymentInfoForm({ eventId, currentPaymentInfo, onSuccess }: Props) {
  const t = useTranslations("paymentInfo");
  const tCommon = useTranslations("common");

  const [bankBIN, setBankBIN] = useState(currentPaymentInfo?.bankBIN ?? "");
  const [accountNumber, setAccountNumber] = useState(currentPaymentInfo?.accountNumber ?? "");
  const [accountName, setAccountName] = useState(currentPaymentInfo?.accountName ?? "");
  const [paypayLink, setPaypayLink] = useState(currentPaymentInfo?.paypayLink ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation: nếu nhập 1 field VietQR thì phải đủ cả 3
    const hasAnyVietQR = !!bankBIN || !!accountNumber || !!accountName;
    if (hasAnyVietQR && (!bankBIN || !accountNumber || !accountName)) {
      setFieldErrors({
        bankBIN: !bankBIN ? t("errorBankRequired") : "",
        accountNumber: !accountNumber ? t("errorAccountNumberRequired") : "",
        accountName: !accountName ? t("errorAccountNameRequired") : "",
      });
      return;
    }

    // Client-side validate PayPay URL format
    if (paypayLink && !paypayLink.startsWith("https://")) {
      setFieldErrors({ paypayLink: t("errorInvalidUrl") });
      return;
    }

    setIsLoading(true);
    try {
      const result = await updatePaymentInfo({
        eventId,
        paymentInfo: {
          bankBIN: bankBIN || null,
          accountNumber: accountNumber || null,
          accountName: accountName || null,
          paypayLink: paypayLink || null,
        },
      });

      if (!result.success) {
        setError(result.error ?? tCommon("error"));
      } else {
        onSuccess?.();
      }
    } catch {
      setError(tCommon("error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── VietQR Section ── */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-bold text-slate-900">{t("sectionVietQR")}</span>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bankBIN" className="text-sm font-medium text-slate-700">{t("bank")}</label>
          <Select value={bankBIN} onValueChange={(v) => setBankBIN(v ?? "")}>
            <SelectTrigger id="bankBIN" className={`h-12 rounded-xl bg-white ${fieldErrors.bankBIN ? "border-destructive focus:ring-destructive" : "focus:ring-blue-600"}`}>
              <SelectValue placeholder={t("bankPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_BANKS.map((bank) => (
                <SelectItem key={bank.bin} value={bank.bin}>
                  {bank.name} ({bank.shortName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.bankBIN && (
            <p className="text-xs text-destructive">{fieldErrors.bankBIN}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="accountNumber" className="text-sm font-medium text-slate-700">{t("accountNumber")}</label>
          <Input
            id="accountNumber"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={t("accountNumberPlaceholder")}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            maxLength={20}
            className={`h-12 rounded-xl bg-white focus-visible:ring-blue-600 ${fieldErrors.accountNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {fieldErrors.accountNumber && (
            <p className="text-xs text-destructive">{fieldErrors.accountNumber}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="accountName" className="text-sm font-medium text-slate-700">{t("accountName")}</label>
          <Input
            id="accountName"
            type="text"
            placeholder={t("accountNamePlaceholder")}
            value={accountName}
            onChange={(e) => setAccountName(e.target.value.toUpperCase())}
            maxLength={50}
            className={`h-12 rounded-xl bg-white focus-visible:ring-blue-600 ${fieldErrors.accountName ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          <p className="text-xs text-muted-foreground">{t("accountNameHint")}</p>
          {fieldErrors.accountName && (
            <p className="text-xs text-destructive">{fieldErrors.accountName}</p>
          )}
        </div>
      </div>

      {/* ── PayPay Section ── */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-red-600" />
          </div>
          <span className="font-bold text-slate-900">{t("sectionPayPay")}</span>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="paypayLink" className="text-sm font-medium text-slate-700">{t("paypayLink")}</label>
          <Input
            id="paypayLink"
            type="url"
            placeholder="https://qr.paypay.ne.jp/..."
            value={paypayLink}
            onChange={(e) => setPaypayLink(e.target.value)}
            className={`h-12 rounded-xl bg-white focus-visible:ring-blue-600 ${fieldErrors.paypayLink ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          <p className="text-xs text-muted-foreground">{t("paypayLinkHint")}</p>
          {fieldErrors.paypayLink && (
            <p className="text-xs text-destructive">{fieldErrors.paypayLink}</p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive text-center bg-destructive/10 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full h-12 rounded-full font-medium active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 w-5 h-5 animate-spin" />}
        {isLoading ? tCommon("loading") : tCommon("save")}
      </Button>
    </form>
  );
}
