"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { markAsPaid, confirmReceived } from "@/actions/settlement";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import VietQR from "@/components/payment/VietQR";
import PayPayLink from "@/components/payment/PayPayLink";
import { buildTransferMessage } from "@/lib/vietqr";

type SettlementRowProps = {
  eventId: string;
  transaction: {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amount: number;
  };
  settlement: {
    id: string;
    status: "PENDING" | "MARKED_PAID" | "CONFIRMED";
  } | null;
  currency: string;
  currentParticipantId: string | null;
  toPaymentInfo?: {
    bankBIN: string | null;
    accountNumber: string | null;
    accountName: string | null;
    paypayLink: string | null;
  } | null;
  eventTitle: string;
  isReadOnly?: boolean;
};

export function SettlementRow({ eventId, transaction, settlement, currency, currentParticipantId, toPaymentInfo, eventTitle, isReadOnly = false }: SettlementRowProps) {
  const t = useTranslations("settlement");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMarkAsPaid = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await markAsPaid({
        eventId,
        fromId: transaction.fromId,
        toId: transaction.toId,
        amount: transaction.amount,
      });
      if (!res.success) {
        setError(res.error || t("error"));
      }
    } catch (err) {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!settlement) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await confirmReceived({
        settlementId: settlement.id,
      });
      if (!res.success) {
        setError(res.error || t("error"));
      }
    } catch (err) {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const isConfirmed = settlement?.status === "CONFIRMED";
  const isMarkedPaid = settlement?.status === "MARKED_PAID";
  const isPending = !settlement || settlement.status === "PENDING";

  const isDebtor = currentParticipantId === transaction.fromId;
  const isCreditor = currentParticipantId === transaction.toId;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 transition-all ${isConfirmed ? "opacity-60 grayscale" : "hover:shadow-md"}`}>
      <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            <span className="font-bold text-slate-900">{transaction.fromName}</span>
            <span className="text-slate-500 font-medium px-1 text-sm">{t("owes")}</span>
            <span className="font-bold text-slate-900">{transaction.toName}</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${isConfirmed ? "line-through text-slate-400" : "text-blue-600"}`}>
            {formatCurrency(transaction.amount, { currency })}
          </div>
          {error && <p className="text-destructive text-sm mt-1">{error}</p>}
        </div>

        {!isReadOnly && (
          <div className="flex flex-col items-end gap-2 shrink-0 w-full md:w-auto">
            {isConfirmed && (
              <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wide">
                {t("confirmed")}
              </div>
            )}

            {isMarkedPaid && (
              <>
                {isCreditor ? (
                  <Button onClick={handleConfirmReceived} disabled={isLoading} className="w-full md:w-auto h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium active:scale-95 transition-all px-6">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("confirmReceived")}
                  </Button>
                ) : (
                  <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-wide text-center">
                    {t("markedPaid", { name: transaction.toName })}
                  </div>
                )}
              </>
            )}

            {isPending && (
              <>
                {isDebtor ? (
                  <div className="flex flex-col gap-2 w-full md:w-auto items-end">
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                      {/* VietQR (Chỉ dành cho tiền tệ VND) */}
                      {currency?.toUpperCase() === "VND" && toPaymentInfo?.bankBIN && toPaymentInfo?.accountNumber ? (
                        <VietQR 
                          bankBIN={toPaymentInfo.bankBIN}
                          accountNumber={toPaymentInfo.accountNumber}
                          accountName={toPaymentInfo.accountName || undefined}
                          amount={transaction.amount}
                          message={buildTransferMessage(transaction.fromName, eventTitle)}
                        />
                      ) : null}

                      {/* Thông tin tài khoản ngân hàng (Cho các tiền tệ khác VND) */}
                      {currency?.toUpperCase() !== "VND" && toPaymentInfo?.bankBIN && toPaymentInfo?.accountNumber ? (
                        <Dialog>
                          <DialogTrigger 
                            render={
                              <Button variant="outline" size="sm" className="flex items-center gap-2" />
                            }
                          >
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            {t("bankInfoBtn", { fallback: "Tài khoản ngân hàng" })}
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md w-11/12 rounded-2xl flex flex-col p-6">
                            <DialogHeader>
                              <DialogTitle className="text-center font-bold text-slate-900">
                                {t("bankInfoDialogTitle", { fallback: "Thông tin chuyển khoản" })}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-200/80 text-sm mt-2">
                              <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                                <span className="text-slate-500 font-medium">{t("bankLabel", { fallback: "Ngân hàng:" })}</span>
                                <span className="font-bold text-slate-800">{toPaymentInfo.bankBIN}</span>
                              </div>
                              <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                                <span className="text-slate-500 font-medium">{t("accountNumberLabel", { fallback: "Số tài khoản:" })}</span>
                                <span className="font-mono font-bold text-slate-900">{toPaymentInfo.accountNumber}</span>
                              </div>
                              {toPaymentInfo.accountName && (
                                <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                                  <span className="text-slate-500 font-medium">{t("accountNameLabel", { fallback: "Chủ tài khoản:" })}</span>
                                  <span className="font-bold uppercase text-slate-800">{toPaymentInfo.accountName}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-2">
                                <span className="text-slate-500 font-medium">{t("amountLabel", { fallback: "Số tiền:" })}</span>
                                <span className="font-bold text-base text-blue-600 font-mono">
                                  {formatCurrency(transaction.amount, { currency })}
                                </span>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : null}
                      
                      {/* PayPay (Chỉ dành cho tiền tệ JPY) */}
                      {currency?.toUpperCase() === "JPY" && toPaymentInfo?.paypayLink ? (
                        <PayPayLink
                          paypayLink={toPaymentInfo.paypayLink}
                          amount={transaction.amount}
                        />
                      ) : null}
                      
                      <Button onClick={handleMarkAsPaid} disabled={isLoading} className="flex-1 md:flex-none h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium active:scale-95 transition-all px-6">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("markAsPaid")}
                      </Button>
                    </div>
                    
                    {(!toPaymentInfo?.bankBIN || !toPaymentInfo?.accountNumber) && (currency?.toUpperCase() !== "JPY" || !toPaymentInfo?.paypayLink) && (
                      <p className="text-xs text-muted-foreground w-full text-center md:text-right mt-1 italic">
                        {t("noPaymentInfo")}
                      </p>
                    )}
                  </div>
                ) : (
                  // Nếu người xem không phải con nợ, và trạng thái đang PENDING (tức chưa chuyển)
                  <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wide">
                    {t("pending")}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
