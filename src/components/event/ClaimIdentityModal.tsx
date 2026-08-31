"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import { claimParticipantIdentity, addParticipant } from "@/actions/participant";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "@/i18n/routing";

type Participant = {
  id: string;
  name: string;
  deviceToken: string | null;
};

type Props = {
  eventId: string;
  participants: Participant[];
};

export default function ClaimIdentityModal({ eventId, participants }: Props) {
  const t = useTranslations("participant");
  const tCommon = useTranslations("common");
  const { needsIdentityClaim } = useParticipantIdentity(participants);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isSkipped, setIsSkipped] = useState(false);

  // Modal sẽ ẩn nếu không cần định danh, HOẶC nếu người dùng đã bấm Bỏ qua
  if (!needsIdentityClaim || isSkipped) return null;

  // LOGIC: Lọc bỏ tài khoản ảo Quỹ Công ty sinh ra tự động
  const realParticipants = participants.filter((p) => p.name !== "🏢 Quỹ Công ty");
  const isBrandNewEvent = realParticipants.length === 0;

  const handleClaim = async (participantId: string) => {
    setLoadingId(participantId);
    setError(null);
    const result = await claimParticipantIdentity(participantId, eventId);
    
    if (!result.success) {
      setError(result.error);
      setLoadingId(null);
    } else {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleCreateSelf = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError(t("errorNameRequired"));
      return;
    }

    setIsCreating(true);
    setError(null);
    
    const result = await addParticipant({ eventId, name: trimmed, isSelf: true });
    if (!result.success) {
      setError(result.error);
      setIsCreating(false);
    } else {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const unclaimedParticipants = realParticipants.filter((p) => !p.deviceToken);

  return (
    <Dialog open={true}>
      <DialogContent 
        className="sm:max-w-[420px] w-[92vw] rounded-3xl p-6 sm:p-8 [&>button]:hidden border-slate-100 shadow-xl bg-white outline-none"
      > 
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-2xl font-extrabold text-slate-900 text-center tracking-tight">
            {isBrandNewEvent ? t("brandNewEventTitle") : t("selectYourName")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {error && (
            <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-2xl text-center animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          {unclaimedParticipants.length > 0 && (
            <div className="space-y-3 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t("selectName")}
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-h-[180px] overflow-y-auto scrollbar-hide p-1">
                {unclaimedParticipants.map((p) => {
                  const isLoadingThis = loadingId === p.id;
                  return (
                    <Button
                      key={p.id}
                      variant="outline"
                      onClick={() => handleClaim(p.id)}
                      disabled={loadingId !== null || isCreating || isPending}
                      className={`rounded-full h-10 px-4 text-xs font-semibold active:scale-95 transition-all flex items-center gap-2 ${
                        isLoadingThis
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      {isLoadingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          <span>{tCommon("loading")}</span>
                        </>
                      ) : (
                        p.name
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chỉ hiện chữ HOẶC nếu như có danh sách người chưa nhận diện */}
          {unclaimedParticipants.length > 0 && (
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-white px-3 text-slate-400 font-bold">{tCommon("or")}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
              {isBrandNewEvent ? t("brandNewEventDesc") : t("areYouNew")}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder={t("namePlaceholder")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={loadingId !== null || isCreating || isPending}
                  maxLength={50}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateSelf()}
                  className="rounded-2xl h-11 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 focus-visible:bg-white pl-10 text-sm font-medium"
                />
              </div>
              <Button
                onClick={handleCreateSelf}
                disabled={!newName.trim() || loadingId !== null || isCreating || isPending}
                className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold active:scale-95 transition-all px-5 h-11 w-full sm:w-auto flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                {isCreating || isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{isBrandNewEvent ? t("brandNewEventBtn") : t("join")}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Nút Hủy / Bỏ qua */}
          <div className="pt-2 text-center w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isBrandNewEvent) {
                  // Nếu là nhóm mới tinh -> Hành động này mang ý nghĩa "Hủy tạo sự kiện"
                  router.push("/");
                } else {
                  // Nếu là nhóm đã có người -> Chỉ là khách vãng lai muốn xem ké
                  setIsSkipped(true);
                }
              }}
              className="w-full sm:w-auto text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 rounded-2xl h-10 px-5 transition-all"
            >
              {isBrandNewEvent ? t("skipBtnNew") : t("skipBtnExisting")}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}