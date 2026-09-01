"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import { claimParticipantIdentity, claimCreatorIdentity, addParticipant } from "@/actions/participant";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Loader2, UserPlus, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { useRouter } from "@/i18n/routing";

type Participant = {
  id: string;
  name: string;
  deviceToken: string | null;
};

type Props = {
  eventId: string;
  participants: Participant[];
  hasPasscode?: boolean;
};

export default function ClaimIdentityModal({ eventId, participants, hasPasscode }: Props) {
  const t = useTranslations("participant");
  const tCommon = useTranslations("common");
  const { needsIdentityClaim } = useParticipantIdentity(participants);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State nhập PIN bảo vệ Creator
  const [pinTarget, setPinTarget] = useState<Participant | null>(null);
  const [passcode, setPasscode] = useState("");
  
  const [isSkipped, setIsSkipped] = useState(false);

  // Modal sẽ ẩn nếu không cần định danh, HOẶC nếu người dùng đã bấm Bỏ qua
  if (!needsIdentityClaim || isSkipped) return null;

  // LOGIC: Lọc bỏ tài khoản ảo Quỹ Công ty sinh ra tự động
  const realParticipants = participants.filter((p) => p.name !== "🏢 Quỹ Công ty");
  const isBrandNewEvent = realParticipants.length === 0;

  const handleClaim = async (participant: Participant) => {
    if (hasPasscode) {
      setPinTarget(participant);
      setPasscode("");
      setError(null);
      return;
    }

    setLoadingId(participant.id);
    setError(null);
    const result = await claimParticipantIdentity(participant.id, eventId);
    
    if (!result.success) {
      if (result.error === "invalid_passcode") {
        setError(t("invalidPasscode"));
      } else {
        setError(result.error);
      }
      setLoadingId(null);
    } else {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleConfirmPin = async () => {
    if (!pinTarget) return;
    if (!passcode.trim()) {
      setError(t("invalidPasscode"));
      return;
    }

    setLoadingId(pinTarget.id);
    setError(null);

    const result = await claimCreatorIdentity({
      eventId,
      participantId: pinTarget.id,
      passcode: passcode.trim(),
    });

    if (!result.success) {
      if (result.error === "invalid_passcode") {
        setError(t("invalidPasscode"));
      } else {
        setError(result.error);
      }
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
        {pinTarget ? (
          <div className="flex flex-col gap-4 py-1 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-1 border border-amber-100 shadow-2xs">
                <Lock className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-extrabold text-slate-900 tracking-tight">
                {t("enterPasscodeTitle")}
              </DialogTitle>
              <p className="text-xs text-slate-500 leading-relaxed px-2">
                {t("enterPasscodeDesc", { name: pinTarget.name })}
              </p>
            </div>

            {error && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-2xl text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={t("passcodePlaceholder")}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loadingId !== null || isPending}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmPin()}
                  className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-amber-500 focus-visible:bg-white pl-10 text-center tracking-widest text-lg font-bold text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPinTarget(null);
                    setPasscode("");
                    setError(null);
                  }}
                  disabled={loadingId !== null || isPending}
                  className="rounded-2xl h-11 px-4 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t("backBtn")}</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmPin}
                  disabled={loadingId !== null || isPending || !passcode.trim()}
                  className="flex-1 rounded-2xl h-11 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {loadingId !== null || isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{tCommon("loading")}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{t("confirmClaimBtn")}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                          onClick={() => handleClaim(p)}
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
                      router.push("/");
                    } else {
                      setIsSkipped(true);
                    }
                  }}
                  className="w-full sm:w-auto text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 rounded-2xl h-10 px-5 transition-all"
                >
                  {isBrandNewEvent ? t("skipBtnNew") : t("skipBtnExisting")}
                </Button>
              </div>

            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}