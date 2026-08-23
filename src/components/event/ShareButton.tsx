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

type Props = {
  eventId: string;
};

export default function ShareButton({ eventId }: Props) {
  const t = useTranslations("event");
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
        // Fallback for older browsers
        alert(t("copyLink") + ":\n" + url);
      }
    } catch (err) {
      console.error("Failed to copy", err);
      alert("Không thể sao chép liên kết.");
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
      // AbortError xảy ra khi user chủ động đóng Share Sheet (không chọn app nào)
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
      <DialogTrigger 
        render={<Button variant="outline" className="rounded-full w-10 h-10 p-0 sm:w-auto sm:px-4 sm:h-10 active:scale-95 transition-all bg-slate-100 hover:bg-slate-200 border-none text-slate-700 shrink-0 shadow-sm" />}
      >
        <QrCode className="w-5 h-5 sm:mr-2" />
        <span className="hidden sm:inline font-semibold">{t("share")}</span>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-normal text-slate-900">{t("shareTitle")}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-6 py-2">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <QRCodeSVG 
              value={url} 
              size={220}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-sm font-medium text-muted-foreground text-center px-4">
            {t("qrCodeTitle")}
          </p>
          
          <div className="flex w-full gap-3 mt-4 flex-col sm:flex-row">
            <Button 
              variant="outline" 
              className="flex-1 gap-2 rounded-full h-12 font-medium active:scale-95 transition-all text-slate-700 border-slate-300 hover:bg-slate-50" 
              onClick={handleCopy}
            >
              {isCopied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-slate-400" />}
              {isCopied ? t("copied") : t("copyLink")}
            </Button>
            
            {canShare && (
              <Button 
                className="flex-1 gap-2 rounded-full h-12 font-medium active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                onClick={handleNativeShare}
                disabled={isSharing}
              >
                <Share className="w-4 h-4" />
                {t("share")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
