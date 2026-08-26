"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { toggleAdvancedMode } from "@/actions/event";
import { cn } from "@/lib/utils";

type Props = {
  eventId: string;
  isAdvancedMode: boolean;
};

export default function AdvancedModeSwitch({ eventId, isAdvancedMode }: Props) {
  const t = useTranslations("event");
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      await toggleAdvancedMode(eventId, checked);
    });
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-2 transition-opacity",
        isPending && "opacity-60 pointer-events-none" // Làm mờ nhẹ và chặn double click khi đang gửi request
      )}
    >
      <span className="text-[10px] sm:text-xs font-medium text-slate-600 whitespace-nowrap select-none">
        {t("advancedMode")}
      </span>
      <Switch 
        checked={isAdvancedMode}
        onCheckedChange={handleToggle}
        disabled={isPending}
        className="data-checked:bg-blue-600" // Sửa lỗi selector Base UI tại đây
      />
    </div>
  );
}