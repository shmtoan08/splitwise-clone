"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";
import { useAlert } from "@/providers/AlertProvider";

interface EventIdBadgeProps {
  id: string;
}

export function EventIdBadge({ id }: EventIdBadgeProps) {
  const t = useTranslations("adminEvents");
  const { showAlert } = useAlert();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      showAlert({
        type: "success",
        title: t("copied_uuid"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={t("copy_uuid_hint")}
      className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-700 bg-slate-100/70 hover:bg-slate-200/70 px-1.5 py-0.5 rounded transition-colors group cursor-pointer"
    >
      <span>{id.slice(0, 8)}...</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-600" />
      ) : (
        <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
      )}
    </button>
  );
}
