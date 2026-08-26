"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Minus, UserPlus } from "lucide-react";
import { updateParticipantFamilyConfig } from "@/actions/participant";

type Props = {
  eventId: string;
  participant: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function FamilyConfigModal({ eventId, participant, open, onOpenChange }: Props) {
  const t = useTranslations("participant");
  const tCommon = useTranslations("common");

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && participant) {
      if (participant.familyConfig) {
        setAdults(participant.familyConfig.adults || 1);
        setChildren(participant.familyConfig.children || []);
      } else {
        setAdults(1);
        setChildren([]);
      }
      setError(null);
    }
  }, [open, participant]);

  const handleAddChild = () => {
    setChildren([...children, 0.5]);
  };

  const handleRemoveChild = (index: number) => {
    const newChildren = [...children];
    newChildren.splice(index, 1);
    setChildren(newChildren);
  };

  const handleChildChange = (index: number, val: string) => {
    const num = parseFloat(val);
    const newChildren = [...children];
    newChildren[index] = isNaN(num) ? 0 : num;
    setChildren(newChildren);
  };

  const totalWeight = adults + children.reduce((sum, c) => sum + (c || 0), 0);

  const handleSave = async () => {
    if (adults < 1) {
      setError(tCommon("error"));
      return;
    }
    for (let c of children) {
      if (c <= 0 || c > 1) {
        setError(tCommon("error"));
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    const res = await updateParticipantFamilyConfig(participant.id, eventId, { adults, children });
    setIsLoading(false);

    if (!res.success) {
      setError(res.error);
    } else {
      onOpenChange(false);
    }
  };

  if (!participant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-3xl p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="text-xl font-semibold text-slate-900 text-center">
            {t("familyConfigTitle")}
          </DialogTitle>
          <p className="text-sm text-slate-500 text-center mt-1">
            {participant.name}
          </p>
        </DialogHeader>

        <div className="px-6 py-4 flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto">
          {error && <p className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded-lg text-center">{error}</p>}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">{t("adults")}</label>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-8 h-8 rounded-full border-slate-200"
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                  disabled={adults <= 1 || isLoading}
                >
                  <Minus className="w-3.5 h-3.5 text-slate-600" />
                </Button>
                <span className="w-4 text-center font-semibold text-slate-800">{adults}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-8 h-8 rounded-full border-slate-200"
                  onClick={() => setAdults(adults + 1)}
                  disabled={isLoading}
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">{t("children")}</label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAddChild} 
                disabled={isLoading}
                className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 rounded-lg"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                {t("addChild")}
              </Button>
            </div>
            
            {children.length === 0 ? (
              <div className="text-sm text-slate-400 italic text-center py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Không có trẻ em
              </div>
            ) : (
              <div className="space-y-2">
                {children.map((child, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="1"
                      value={child}
                      onChange={(e) => handleChildChange(index, e.target.value)}
                      disabled={isLoading}
                      className="h-10 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-600"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveChild(index)}
                      disabled={isLoading}
                      className="w-10 h-10 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-auto pt-2 pb-2">
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm text-blue-800 font-medium">{t("totalWeight", { total: "" })}</span>
              <span className="text-lg font-bold text-blue-600">{totalWeight}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-6 pb-6 pt-3 border-t border-slate-100 bg-white shrink-0 sm:rounded-b-3xl">
          <Button onClick={handleSave} disabled={isLoading} className="w-full h-12 rounded-full font-medium active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-base">
            {isLoading ? tCommon("loading") : tCommon("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
