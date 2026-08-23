"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";
import { addParticipant } from "@/actions/participant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, User, Settings2 } from "lucide-react";
import PaymentInfoForm from "@/components/event/PaymentInfoForm";

type PaymentInfo = {
  bankBIN: string | null;
  accountNumber: string | null;
  accountName: string | null;
  paypayLink: string | null;
} | null;

type Participant = {
  id: string;
  name: string;
  deviceToken: string | null;
  paymentInfo?: PaymentInfo;
};

type Props = {
  eventId: string;
  participants: Participant[];
};

export default function ParticipantList({ eventId, participants }: Props) {
  const t = useTranslations("participant");
  const tPayment = useTranslations("paymentInfo");
  const tCommon = useTranslations("common");
  const { identity, isCurrentParticipant } = useParticipantIdentity(participants);

  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);

  const handleAddMember = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError(tCommon("error"));
      return;
    }

    setIsAdding(true);
    setError(null);
    
    // Add member (isSelf = false)
    const result = await addParticipant({ eventId, name: trimmed, isSelf: false });
    if (!result.success) {
      setError(result.error);
    } else {
      setNewName("");
    }
    
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Scrollable list of members */}
      <div className="flex-1 px-4 py-4 overflow-y-auto scrollbar-hide">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
            {t("noMembers")}
          </div>
        ) : (
          <ul className="space-y-3 pb-32">
            {participants.map((p) => {
              const isMe = isCurrentParticipant(p.id);
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.98] ${
                    isMe 
                      ? "bg-blue-50/50 border-blue-200" 
                      : "bg-white border-slate-200 hover:shadow-md"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                    <User size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate flex items-center">
                      {p.name}
                      {isMe && <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Bạn</span>}
                    </p>
                    {isMe && p.paymentInfo?.bankBIN && (
                      <p className="text-xs text-slate-500 truncate mt-1 font-medium">
                        🏦 {p.paymentInfo.accountNumber}
                      </p>
                    )}
                  </div>

                  {/* Chỉ hiện nút cài đặt cho chính mình */}
                  {isMe && (
                    <Dialog
                      open={openDialogId === p.id}
                      onOpenChange={(open) => setOpenDialogId(open ? p.id : null)}
                    >
                      <DialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            className="shrink-0 w-10 h-10 p-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition-all"
                            title={t("setupPayment")}
                          />
                        }
                      >
                        <Settings2 className="w-4 h-4" />
                        <span className="sr-only">{t("setupPayment")}</span>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-normal text-slate-900 text-center">{tPayment("dialogTitle")}</DialogTitle>
                        </DialogHeader>
                        <PaymentInfoForm
                          eventId={eventId}
                          currentPaymentInfo={p.paymentInfo ?? null}
                          onSuccess={() => setOpenDialogId(null)}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add member form anchored at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white/90 backdrop-blur-md shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-10">
        {error && <p className="text-sm text-destructive mb-2 text-center">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t("namePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={isAdding}
            maxLength={50}
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            className="flex-1 bg-slate-50 border-slate-200 h-12 rounded-full px-4 focus-visible:ring-blue-600 focus-visible:bg-white"
          />
          <Button
            onClick={handleAddMember}
            disabled={!newName.trim() || isAdding}
            className="shrink-0 h-12 rounded-full font-medium transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto px-6 shadow-sm"
          >
            {isAdding ? (
              tCommon("loading")
            ) : (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                {t("addMember")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

