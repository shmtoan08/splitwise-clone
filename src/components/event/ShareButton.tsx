"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Share, Copy, Check, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAlert } from "@/providers/AlertProvider";

type Props = {
  eventId: string;
};

export default function ShareButton({ eventId }: Props) {
  const t = useTranslations("event");
  const { showAlert } = useAlert();

  const [url, setUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const currentUrl = window.location.href;
    setUrl(currentUrl);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
  }, []);

  const handleCopy = async () => {
    if (!url) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } else {
        showAlert({
          type: "info",
          title: t("copyLink"),
          message: url,
        });
      }
    } catch (err) {
      console.error("Failed to copy", err);
      showAlert({
        type: "error",
        title: t("errorCopyLinkTitle"),
        message: t("errorCopyLinkMessage"),
      });
    }
  };

  const handleNativeShare = async () => {
    if (!url || !canShare || isSharing) return;
    try {
      setIsSharing(true);
      await navigator.share({
        title: t("shareTitle"),
        url: url,
      });
      setIsOpen(false);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Share failed", err);
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (!url) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Khôi phục cú pháp render chuẩn của Base UI */}
      <DialogTrigger
        render={
          <Button variant="outline" className="rounded-full w-10 h-10 p-0 sm:w-auto sm:px-4 sm:h-10 active:scale-95 transition-all bg-slate-100 hover:bg-slate-200 border-none text-slate-700 shrink-0 shadow-sm" />
        }
      >
        <QrCode className="w-5 h-5 sm:mr-2" />
        <span className="hidden sm:inline font-semibold">{t("share")}</span>
      </DialogTrigger>
      
      {/* Giữ nguyên các cải tiến chống ép chiều cao trên mobile */}
      <DialogContent className="sm:max-w-md w-[calc(100vw-32px)] sm:w-[95vw] rounded-3xl p-0 gap-0 overflow-hidden flex flex-col max-h-[calc(100dvh-32px)] sm:max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="text-center text-xl sm:text-2xl font-bold text-slate-900">
            {t("shareTitle")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-5 px-6 pt-6 pb-4 flex-1 min-h-0 overflow-y-auto">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm shrink-0">
            <QRCodeSVG 
              value={url} 
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>
          
          <p className="text-sm font-medium text-slate-500 text-center shrink-0">
            {t("qrCodeTitle")}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full gap-3 px-6 pb-6 pt-4 border-t border-slate-100 bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] sm:rounded-b-3xl">
          <Button 
            variant="outline" 
            className="w-full sm:flex-1 gap-2 rounded-full h-12 font-semibold active:scale-95 transition-all text-slate-700 border-slate-200 hover:bg-slate-50 shrink-0" 
            onClick={handleCopy}
          >
            {isCopied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-slate-400" />}
            {isCopied ? t("copied") : t("copyLink")}
          </Button>
          
          {canShare && (
            <Button 
              className="w-full sm:flex-1 gap-2 rounded-full h-12 font-semibold active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0"
              onClick={handleNativeShare}
              disabled={isSharing}
            >
              <Share className="w-5 h-5" />
              {t("share")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}