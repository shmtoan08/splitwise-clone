"use client";

import { buildVietQRUrl } from "@/lib/vietqr";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = { 
  bankBIN: string; 
  accountNumber: string; 
  accountName?: string;
  amount: number; 
  message: string;
};

export default function VietQR({ bankBIN, accountNumber, accountName, amount, message }: Props) {
  const t = useTranslations("settlement");

  const qrUrl = buildVietQRUrl({ 
    bankId: bankBIN, 
    accountNumber, 
    accountName,
    amount, 
    description: message 
  });

  return (
    <Dialog>
      <DialogTrigger 
        render={
          <Button variant="outline" size="sm" className="flex items-center gap-2" />
        }
      >
        <QrCode className="w-4 h-4" />
        {t("scanToPay")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-11/12 rounded-xl flex flex-col items-center">
        <DialogHeader>
          <DialogTitle className="text-center">{t("scanToPay")}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl w-full">
          <img src={qrUrl} alt="VietQR" className="w-64 h-64 object-contain" />
          
          <div className="mt-4 text-center space-y-1 w-full bg-muted/20 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">{t("bankInfoLabel")}</p>
            <p className="font-semibold">{bankBIN} - {accountNumber}</p>
            {accountName && <p className="font-bold uppercase">{accountName}</p>}
            <p className="text-lg font-bold text-primary mt-2">
              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
