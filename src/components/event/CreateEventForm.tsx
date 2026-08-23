"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEvent } from "@/actions/event";
import { ArrowRight } from "lucide-react";

export default function CreateEventForm() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    const title = formData.get("title")?.toString().trim();
    if (!title) {
      setError(tCommon("error")); // Can use a more specific error key if needed, or rely on client validation
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createEvent({ title });
      if (result && !result.success) {
        setError(result.error);
      }
    });
  };

  return (
    <form action={handleSubmit} className="w-full max-w-md mx-auto space-y-4">
      <div className="space-y-2">
        <Input
          name="title"
          placeholder={t("groupNamePlaceholder")}
          required
          maxLength={100}
          disabled={isPending}
          className="w-full p-6 text-lg rounded-xl shadow-sm border-gray-200"
        />
      </div>
      
      {error && (
        <div className="text-red-500 text-sm text-center">
          {error}
        </div>
      )}

      <Button 
        type="submit" 
        size="lg"
        disabled={isPending}
        className="rounded-full w-full py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 border-0 flex items-center justify-center gap-2"
      >
        {isPending ? tCommon("loading") : t("createGroup")}
        {!isPending && <ArrowRight className="w-5 h-5" />}
      </Button>
    </form>
  );
}
