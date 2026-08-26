"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export type AlertType = "success" | "error" | "warning" | "info";

export type AlertOptions = {
  title: string;
  message?: string;
  type?: AlertType;
  confirmText?: string;
  onConfirm?: () => void;
};

type AlertContextValue = {
  showAlert: (options: AlertOptions) => void;
};

// ── Context ────────────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue>({
  showAlert: () => {},
});

export const useAlert = () => useContext(AlertContext);

// ── Icon & color config ────────────────────────────────────────────────────

const CONFIG: Record<
  AlertType,
  { Icon: React.ElementType; iconColor: string; iconBg: string; btnClass: string }
> = {
  success: {
    Icon: CheckCircle2,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  error: {
    Icon: AlertCircle,
    iconColor: "text-rose-500",
    iconBg: "bg-rose-50",
    btnClass: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-50",
    btnClass: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  info: {
    Icon: Info,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    btnClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

// ── Provider ───────────────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<AlertOptions>({ title: "", type: "info" });

  const showAlert = useCallback((options: AlertOptions) => {
    setOpts(options);
    setOpen(true);
  }, []);

  const handleConfirm = () => {
    setOpen(false);
    opts.onConfirm?.();
  };

  const handleClose = () => setOpen(false);

  const { Icon, iconColor, iconBg, btnClass } = CONFIG[opts.type ?? "info"];

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[400px] w-[90vw] rounded-3xl p-0 overflow-hidden"
        >
          {/* Body */}
          <div className="flex flex-col items-center text-center p-6 gap-4">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconBg}`}>
              <Icon className={`w-8 h-8 ${iconColor}`} strokeWidth={2} />
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {opts.title}
            </h2>

            {/* Message */}
            {opts.message && (
              <p className="text-sm text-slate-500 font-medium leading-relaxed -mt-1">
                {opts.message}
              </p>
            )}

            {/* Button */}
            <button
              onClick={handleConfirm}
              className={`w-full h-12 rounded-full font-bold text-base active:scale-95 transition-all shadow-sm mt-1 ${btnClass}`}
            >
              {opts.confirmText ?? tCommon("close")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AlertContext.Provider>
  );
}
