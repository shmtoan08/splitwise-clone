"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEventRoundingMode } from "@/actions/event";
import { Scale, Check, Loader2, Sparkles, RefreshCw } from "lucide-react";

type Props = {
  eventId: string;
  currentRoundingMode: "ROUND_ROBIN" | "ROUND_UP";
  isCreator: boolean;
};

export default function RoundingSettingButton({
  eventId,
  currentRoundingMode,
  isCreator,
}: Props) {
  const t = useTranslations("rounding");
  const tCommon = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<"ROUND_ROBIN" | "ROUND_UP">(
    currentRoundingMode
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  if (!isCreator) return null;

  const handleSave = async () => {
    if (selected === currentRoundingMode) {
      setOpen(false);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const res = await updateEventRoundingMode({
      eventId,
      roundingMode: selected,
    });

    setIsLoading(false);

    if (!res.success) {
      setMessage({
        type: "error",
        text: res.error || tCommon("error"),
      });
      return;
    }

    setMessage({ type: "success", text: t("saveSuccess") });
    setTimeout(() => setOpen(false), 1200);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setSelected(currentRoundingMode);
      setMessage(null);
    }
  };

  const options = [
    {
      id: "ROUND_ROBIN" as const,
      icon: RefreshCw,
      title: t("roundRobin"),
      desc: t("roundRobinDesc"),
    },
    {
      id: "ROUND_UP" as const,
      icon: Sparkles,
      title: t("roundUp"),
      desc: t("roundUpDesc"),
    },
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 rounded-full text-xs font-bold border-slate-200 text-slate-700 bg-white/80 shadow-sm hover:bg-slate-100 active:scale-95 transition-all gap-1.5 px-3"
        title={t("settingButtonTooltip")}
      >
        <Scale className="w-3.5 h-3.5 text-slate-500" />
        <span>{t("settingButton")}</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden bg-slate-50 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 text-center">
                {t("roundingMode")}
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {options.map((opt) => {
              const isSelected = selected === opt.id;
              const isCurrent = currentRoundingMode === opt.id;
              const Icon = opt.icon;

              return (
                <div
                  key={opt.id}
                  onClick={() => !isLoading && setSelected(opt.id)}
                  className={`flex items-start justify-between p-4 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                    isSelected
                      ? "bg-indigo-50/80 border-2 border-indigo-500 shadow-sm ring-1 ring-indigo-500/20"
                      : "bg-white border border-slate-200/80 shadow-sm hover:border-slate-300"
                  } ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors mt-0.5 ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-sm sm:text-base leading-tight ${
                            isSelected ? "text-indigo-950" : "text-slate-900"
                          }`}
                        >
                          {opt.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            {t("currentlySelected")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="shrink-0 mt-1 animate-in zoom-in-50 duration-200">
                      <Check className="w-5 h-5 text-indigo-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            {message && (
              <div
                className={`text-xs font-semibold text-center p-3 mb-3 rounded-xl border animate-in slide-in-from-bottom-2 ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : message.type === "warning"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-rose-50 text-rose-600 border-rose-100"
                }`}
              >
                {message.text}
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={isLoading || selected === currentRoundingMode}
              className="w-full h-12 rounded-full font-semibold text-base active:scale-95 transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{tCommon("processing")}</span>
                </>
              ) : (
                <span>{tCommon("save")}</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
