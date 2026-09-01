"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEventRoundingMode, toggleAdvancedMode, updateEventPasscode } from "@/actions/event";
import { Settings, Check, Loader2, Sparkles, RefreshCw, Sliders, Shield, KeyRound, Lock, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  eventId: string;
  isAdvancedMode: boolean;
  currentRoundingMode: "ROUND_ROBIN" | "ROUND_UP";
  initialPasscode?: string | null;
  isCreator: boolean;
};

export default function EventSettingsButton({
  eventId,
  isAdvancedMode: initialAdvancedMode,
  currentRoundingMode,
  initialPasscode,
  isCreator,
}: Props) {
  const t = useTranslations("settings");
  const tRounding = useTranslations("rounding");
  const tCommon = useTranslations("common");

  const [open, setOpen] = useState(false);
  const [selectedRounding, setSelectedRounding] = useState<"ROUND_ROBIN" | "ROUND_UP">(
    currentRoundingMode
  );
  const [isAdvanced, setIsAdvanced] = useState(initialAdvancedMode);
  const [passcode, setPasscode] = useState(initialPasscode || "");
  const [isPasscodeLoading, setIsPasscodeLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdvancedPending, startAdvancedTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  if (!isCreator) return null;

  const handleToggleAdvanced = (checked: boolean) => {
    setIsAdvanced(checked);
    startAdvancedTransition(async () => {
      const res = await toggleAdvancedMode(eventId, checked);
      if (!res.success) {
        setIsAdvanced(!checked);
        setMessage({
          type: "error",
          text: res.error || tCommon("error"),
        });
      }
    });
  };

  const handleSaveRounding = async () => {
    if (selectedRounding === currentRoundingMode) {
      setOpen(false);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const res = await updateEventRoundingMode({
      eventId,
      roundingMode: selectedRounding,
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

  const handleSavePasscode = async (newPasscode: string | null) => {
    setIsPasscodeLoading(true);
    setMessage(null);

    const res = await updateEventPasscode({
      eventId,
      passcode: newPasscode,
    });

    setIsPasscodeLoading(false);

    if (!res.success) {
      setMessage({
        type: "error",
        text: res.error || tCommon("error"),
      });
      return;
    }

    setPasscode(newPasscode || "");
    setMessage({ type: "success", text: t("passcodeSaved") });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setSelectedRounding(currentRoundingMode);
      setIsAdvanced(initialAdvancedMode);
      setPasscode(initialPasscode || "");
      setMessage(null);
    }
  };

  const roundingOptions = [
    {
      id: "ROUND_ROBIN" as const,
      icon: RefreshCw,
      title: tRounding("roundRobin"),
      desc: tRounding("roundRobinDesc"),
    },
    {
      id: "ROUND_UP" as const,
      icon: Sparkles,
      title: tRounding("roundUp"),
      desc: tRounding("roundUpDesc"),
    },
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 rounded-full text-xs font-bold border-slate-200 text-slate-700 bg-white/80 shadow-sm hover:bg-slate-100 active:scale-95 transition-all gap-1.5 px-2.5 sm:px-3"
        title={t("title")}
      >
        <Settings className="w-3.5 h-3.5 text-slate-500" />
        <span className="hidden sm:inline">{t("button")}</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden bg-slate-50 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 text-center flex items-center justify-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <span>{t("title")}</span>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Section 1: Chế độ nâng cao */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {t("advancedSectionTitle")}
                    </h4>
                  </div>
                </div>

                <Switch
                  checked={isAdvanced}
                  onCheckedChange={handleToggleAdvanced}
                  disabled={isAdvancedPending}
                  className="data-checked:bg-blue-600 shrink-0"
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed pl-10.5">
                {t("advancedSectionDesc")}
              </p>
            </div>

            {/* Section 2: Quy tắc làm tròn tiền lẻ */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                {t("roundingSectionTitle")}
              </label>

              <div className="space-y-2.5">
                {roundingOptions.map((opt) => {
                  const isSelected = selectedRounding === opt.id;
                  const isCurrent = currentRoundingMode === opt.id;
                  const Icon = opt.icon;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => !isLoading && setSelectedRounding(opt.id)}
                      className={`flex items-start justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                        isSelected
                          ? "bg-indigo-50/80 border-2 border-indigo-500 shadow-sm ring-1 ring-indigo-500/20"
                          : "bg-white border border-slate-200/80 shadow-sm hover:border-slate-300"
                      } ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors mt-0.5 ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </div>

                        <div className="flex flex-col pr-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold text-sm leading-tight ${
                                isSelected ? "text-indigo-950" : "text-slate-900"
                              }`}
                            >
                              {opt.title}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                {tRounding("currentlySelected")}
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
                          <Check className="w-4.5 h-4.5 text-indigo-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Mã PIN bảo mật Quản trị viên */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {t("passcodeSectionTitle")}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("passcodeSectionDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder={t("passcodePlaceholder")}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    disabled={isPasscodeLoading}
                    className="h-10 pl-9 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium tracking-widest"
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSavePasscode(passcode.trim())}
                  disabled={isPasscodeLoading || passcode.trim().length < 4}
                  className="h-10 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0"
                >
                  {isPasscodeLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{t("savePasscode")}</span>
                  )}
                </Button>

                {initialPasscode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSavePasscode(null)}
                    disabled={isPasscodeLoading}
                    title={t("removePasscode")}
                    className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

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
              onClick={handleSaveRounding}
              disabled={isLoading || selectedRounding === currentRoundingMode}
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
