"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import { claimParticipantIdentity, addParticipant } from "@/actions/participant";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";

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

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If there's no event or we don't need to claim identity, don't show
  if (!needsIdentityClaim) return null;

  const handleClaim = async (participantId: string) => {
    setLoadingId(participantId);
    setError(null);
    const result = await claimParticipantIdentity(participantId, eventId);
    if (!result.success) {
      setError(result.error);
    } else {
      // The page will revalidate and update the deviceToken, 
      // but useParticipantIdentity will pick it up on next render.
      window.location.reload(); // Simple reload to ensure everything is synced up
    }
    setLoadingId(null);
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
      window.location.reload();
    }
  };

  const unclaimedParticipants = participants.filter((p) => !p.deviceToken);

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-3xl p-6 sm:p-8 [&>button]:hidden"> 
        {/* Hide default close button because they MUST pick an identity */}
        <DialogHeader>
          <DialogTitle className="text-2xl font-normal text-slate-900 text-center">
            {t("selectYourName")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          {unclaimedParticipants.length > 0 && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-500 font-medium">{t("selectName")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {unclaimedParticipants.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    onClick={() => handleClaim(p.id)}
                    disabled={loadingId !== null || isCreating}
                    className="rounded-full active:scale-95 transition-all text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200"
                  >
                    {loadingId === p.id ? tCommon("loading") : p.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-normal">{tCommon("or")}</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-500 font-medium text-center">{t("areYouNew")}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder={t("namePlaceholder")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={loadingId !== null || isCreating}
                  maxLength={50}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateSelf()}
                  className="rounded-xl h-12 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-600 focus-visible:bg-white pl-11"
                />
              </div>
              <Button
                onClick={handleCreateSelf}
                disabled={!newName.trim() || loadingId !== null || isCreating}
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium active:scale-95 transition-all px-8 h-12 w-full sm:w-auto"
              >
                {isCreating ? tCommon("loading") : t("join")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
