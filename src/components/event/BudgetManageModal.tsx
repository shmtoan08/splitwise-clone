"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateParticipantBudgets } from "@/actions/budget";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Crown, UserCheck, ShieldCheck } from "lucide-react";

type BudgetMode = "FIXED" | "UNLIMITED" | "SELF_FUNDED";

type Participant = {
  id: string;
  name: string;
  budgetMode?: BudgetMode;
  budget?: number;
  weight?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  baseCurrency: string;
  avgBudget?: number | null;
  participants: Participant[];
};

export default function BudgetManageModal({
  open,
  onOpenChange,
  eventId,
  baseCurrency,
  avgBudget,
  participants,
}: Props) {
  const tBudget = useTranslations("budget");
  const tCommon = useTranslations("common");

  const [avgInput, setAvgInput] = useState<string>("");
  // Lưu chế độ ngân sách nháp cho từng người
  const [draftModes, setDraftModes] = useState<Record<string, BudgetMode>>({});
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number>>({});
  const [draftWeights, setDraftWeights] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const realParticipants = participants.filter(
    (p) => p.name !== "🏢 Quỹ Công ty"
  );

  // 1. Khởi tạo dữ liệu khi mở Modal
  useEffect(() => {
    if (open) {
      const initialModes: Record<string, BudgetMode> = {};
      const initialDrafts: Record<string, number> = {};
      const initialWeights: Record<string, string> = {};

      realParticipants.forEach((p) => {
        const mode = p.budgetMode || "FIXED";
        initialModes[p.id] = mode;

        const currentBudget = p.budget || 0;
        initialDrafts[p.id] = currentBudget;

        if (avgBudget && avgBudget > 0 && currentBudget > 0) {
          initialWeights[p.id] = (Math.round((currentBudget / avgBudget) * 100) / 100).toString();
        } else {
          initialWeights[p.id] = (p.weight || 1.0).toString();
        }
      });

      setDraftModes(initialModes);
      setDraftBudgets(initialDrafts);
      setDraftWeights(initialWeights);

      if (avgBudget && avgBudget > 0) {
        setAvgInput(avgBudget.toLocaleString("en-US"));
      } else {
        setAvgInput("");
      }
    }
  }, [open, avgBudget, participants]);

  // 2. Logic: Đổi mức trung bình -> Tự tính lại cho những ai ở chế độ FIXED
  const handleAvgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const num = parseInt(raw, 10);
    setAvgInput(isNaN(num) ? "" : num.toLocaleString("en-US"));

    if (!isNaN(num) && num > 0) {
      setDraftBudgets((prev) => {
        const next = { ...prev };
        realParticipants.forEach((p) => {
          if ((draftModes[p.id] || "FIXED") === "FIXED") {
            const w = parseFloat(draftWeights[p.id]) || 0;
            next[p.id] = Math.round(num * w);
          }
        });
        return next;
      });
    }
  };

  // 3. Logic: Sửa Hệ số
  const handleWeightChange = (pId: string, val: string) => {
    setDraftWeights((prev) => ({ ...prev, [pId]: val }));
    const numWeight = parseFloat(val) || 0;
    const avg = parseInt(avgInput.replace(/\D/g, ""), 10) || 0;
    
    if (avg > 0) {
      setDraftBudgets((prev) => ({ ...prev, [pId]: Math.round(avg * numWeight) }));
    }
  };

  // 4. Logic: Sửa Số tiền trực tiếp
  const handleBudgetChange = (pId: string, val: string) => {
    const raw = val.replace(/\D/g, "");
    const newBudget = parseInt(raw, 10) || 0;
    setDraftBudgets((prev) => ({ ...prev, [pId]: newBudget }));

    const avg = parseInt(avgInput.replace(/\D/g, ""), 10) || 0;
    if (avg > 0) {
      const newWeight = (Math.round((newBudget / avg) * 100) / 100).toString();
      setDraftWeights((prev) => ({ ...prev, [pId]: newWeight }));
    }
  };

  // 5. Logic: Đổi Chế độ Ngân sách (FIXED / UNLIMITED / SELF_FUNDED)
  const handleModeChange = (pId: string, mode: BudgetMode) => {
    setDraftModes((prev) => ({ ...prev, [pId]: mode }));
    
    // Nếu chuyển sang Cố định, tự tính lại số tiền theo avgInput nếu có
    if (mode === "FIXED") {
      const avg = parseInt(avgInput.replace(/\D/g, ""), 10) || 0;
      const w = parseFloat(draftWeights[pId]) || 1.0;
      if (avg > 0) {
        setDraftBudgets((prev) => ({ ...prev, [pId]: Math.round(avg * w) }));
      }
    }
  };

  // Tính tổng ngân sách dự kiến (chỉ cộng những người ở chế độ FIXED)
  const totalEstimatedBudget = Object.entries(draftBudgets).reduce(
    (sum, [pId, amount]) => {
      const mode = draftModes[pId] || "FIXED";
      return sum + (mode === "FIXED" ? (amount || 0) : 0);
    },
    0
  );

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const parsedAvg = parseInt(avgInput.replace(/\D/g, ""), 10) || 0;
      
      const payload = realParticipants.map((p) => {
        const mode = draftModes[p.id] || "FIXED";
        return {
          participantId: p.id,
          budgetMode: mode,
          budget: mode === "FIXED" ? (draftBudgets[p.id] || 0) : 0,
        };
      });

      await updateParticipantBudgets({
        eventId,
        avgBudget: parsedAvg,
        budgets: payload,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Lỗi khi lưu ngân sách:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-[95vw] rounded-3xl p-4 sm:p-6 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 text-center">
            {tBudget("manageBudget") || "Quản lý Ngân sách / Đài thọ"}
          </DialogTitle>
          <p className="text-xs text-slate-500 text-center mt-0.5">
            Cấu hình định mức đài thọ hoặc hỗ trợ theo thực phí cho từng thành viên.
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2 flex-1 overflow-hidden flex flex-col">
          
          {/* Mức ngân sách trung bình */}
          <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200/80">
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Mức ngân sách định mức / 1 phần
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="VD: 500,000"
              value={avgInput}
              onChange={handleAvgChange}
              className="rounded-xl h-10 bg-white border-slate-200 focus-visible:ring-indigo-500 text-base font-bold text-indigo-700"
            />
          </div>

          {/* Danh sách thành viên */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 border-t border-b border-slate-100 py-2.5">
            {realParticipants.map((p) => {
              const currentMode = draftModes[p.id] || "FIXED";
              const originalWeight = p.weight || 1.0;
              const currentWeight = draftWeights[p.id] ?? originalWeight.toString();
              const currentBudget = draftBudgets[p.id];

              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {p.name}
                    </span>

                    {/* Selector 3 Chế Độ */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => handleModeChange(p.id, "FIXED")}
                        className={`px-2 py-1 rounded-lg transition-all ${
                          currentMode === "FIXED"
                            ? "bg-white text-emerald-700 shadow-sm font-bold"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Cố định
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeChange(p.id, "UNLIMITED")}
                        className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          currentMode === "UNLIMITED"
                            ? "bg-amber-500 text-white shadow-sm font-bold"
                            : "text-slate-500 hover:text-amber-600"
                        }`}
                      >
                        <Crown className="w-3 h-3" />
                        Thực phí
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeChange(p.id, "SELF_FUNDED")}
                        className={`px-2 py-1 rounded-lg transition-all ${
                          currentMode === "SELF_FUNDED"
                            ? "bg-slate-700 text-white shadow-sm font-bold"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Tự túc
                      </button>
                    </div>
                  </div>

                  {/* Vùng nhập liệu / Badge hiển thị tùy theo Chế Độ */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    {currentMode === "FIXED" && (
                      <>
                        <span className="text-slate-400 font-medium">
                          Hệ số: {originalWeight} phần
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            value={currentWeight}
                            onChange={(e) => handleWeightChange(p.id, e.target.value)}
                            className="w-12 text-center rounded-lg h-8 border-slate-200 font-bold text-xs bg-slate-50"
                            step="0.5"
                            min="0"
                          />
                          <span className="text-slate-300 font-bold">=</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={currentBudget ? currentBudget.toLocaleString("en-US") : ""}
                            onChange={(e) => handleBudgetChange(p.id, e.target.value)}
                            className="w-24 text-right rounded-lg h-8 border-slate-200 font-bold text-xs text-emerald-700 bg-emerald-50/30"
                          />
                        </div>
                      </>
                    )}

                    {currentMode === "UNLIMITED" && (
                      <div className="w-full flex items-center justify-between text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60">
                        <span className="font-semibold flex items-center gap-1.5 text-xs">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          Được đài thọ 100% chi phí thực tế
                        </span>
                        <span className="font-extrabold uppercase text-[10px] tracking-wider bg-amber-200/60 px-1.5 py-0.5 rounded-md">
                          Thực tích
                        </span>
                      </div>
                    )}

                    {currentMode === "SELF_FUNDED" && (
                      <div className="w-full flex items-center justify-between text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                        <span className="font-semibold flex items-center gap-1.5 text-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          Tự chi trả toàn bộ phần chi tiêu
                        </span>
                        <span className="font-bold text-xs">0 {baseCurrency}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tổng kết & Nút Lưu */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80">
              <span className="text-xs sm:text-sm font-semibold text-emerald-900">
                Tổng ngân sách định mức cố định:
              </span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                {formatCurrency(totalEstimatedBudget, { currency: baseCurrency })}
              </span>
            </div>

            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 font-semibold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{tCommon("save") || "Lưu thiết lập ngân sách"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}