"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Minus, UserPlus, Users, Sparkles, Loader2 } from "lucide-react";
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
      <DialogContent className="sm:max-w-[420px] w-[95vw] rounded-3xl p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh] bg-slate-50 border-slate-100 shadow-2xl">
        
        {/* Header cố định với Badge tên thành viên */}
        <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-100 shrink-0 text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {t("familyConfigTitle")}
            </DialogTitle>
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mx-auto">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>{participant.name}</span>
            </div>
          </DialogHeader>
        </div>

        {/* Nội dung cuộn chính */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {error && (
            <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-2xl text-center animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          {/* Thẻ chỉnh số lượng Người lớn */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-sm">{t("adults")}</span>
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">{t("adultWeightDesc")}</span>
            </div>
            
            {/* Bộ tăng giảm (Stepper) dạng viên thuốc */}
            <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-full border border-slate-200/60">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full hover:bg-white hover:shadow-sm active:scale-95 transition-all text-slate-600"
                onClick={() => setAdults(Math.max(1, adults - 1))}
                disabled={adults <= 1 || isLoading}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <span className="w-5 text-center font-extrabold text-slate-900 text-sm">{adults}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full hover:bg-white hover:shadow-sm active:scale-95 transition-all text-slate-600"
                onClick={() => setAdults(adults + 1)}
                disabled={isLoading}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Thẻ danh sách Trẻ em */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm">{t("children")}</span>
                <span className="text-[11px] text-slate-400 font-medium mt-0.5">{t("childWeightDesc")}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddChild} 
                disabled={isLoading}
                className="h-8 rounded-full text-xs font-bold text-blue-600 bg-blue-50/60 border-blue-200 hover:bg-blue-100 active:scale-95 transition-all gap-1 px-3"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t("addChild")}
              </Button>
            </div>
            
            {children.length === 0 ? (
              <div className="text-xs text-slate-400 font-medium text-center py-4 bg-slate-50/80 rounded-xl border border-dashed border-slate-200">
                {t("noChildren")}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {children.map((child, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 gap-3">
                    <span className="text-xs font-bold text-slate-700 shrink-0">
                      {t("childIndex", { index: index + 1 })}
                    </span>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <div className="relative flex-1 max-w-[110px]">
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="1"
                          value={child}
                          onChange={(e) => handleChildChange(index, e.target.value)}
                          disabled={isLoading}
                          className="h-9 text-xs font-bold text-right rounded-lg bg-white border-slate-200 focus-visible:ring-blue-500 pr-8"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                          {t("portionUnit")}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveChild(index)}
                        disabled={isLoading}
                        className="w-8 h-8 shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg active:scale-95 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Thẻ nổi bật Tổng hệ số (Total Weight Banner) */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm mt-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                  {t("totalWeightLabel")}
                </span>
                <span className="text-[11px] font-medium text-blue-600">{t("totalWeightDesc")}</span>
              </div>
            </div>
            <span className="text-2xl font-black text-blue-700 tracking-tight">
              x{totalWeight}
            </span>
          </div>
        </div>

        {/* Footer cố định chứa nút Action */}
        <div className="p-4 sm:px-6 bg-white border-t border-slate-100 shrink-0">
          <Button 
            onClick={handleSave} 
            disabled={isLoading} 
            className="w-full h-12 rounded-full font-bold text-base active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {tCommon("loading")}
              </>
            ) : (
              tCommon("save")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}