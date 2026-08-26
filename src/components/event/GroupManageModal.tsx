"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { createGroup, updateGroup, deleteGroup } from "@/actions/group";
import { User } from "lucide-react";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";


type Participant = {
  id: string;
  name: string;
};

type Group = {
  id: string;
  name: string;
  members: { participantId: string }[];
};

type Props = {
  eventId: string;
  participants: Participant[];
  group?: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingGroups: Group[];
};

export default function GroupManageModal({ eventId, participants, group, open, onOpenChange, existingGroups }: Props) {
  const tGroup = useTranslations("group");
  const { isCurrentParticipant } = useParticipantIdentity(participants);
  const isEdit = !!group;

  const [name, setName] = useState(group?.name || tGroup("newGroupTitle", { number: (existingGroups?.length || 0) + 1 }));

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (group) {
        setName(group.name);
        setSelectedIds(group.members.map(m => m.participantId));
      } else {
        setName(tGroup("newGroupTitle", { number: (existingGroups?.length || 0) + 1 }));
        setSelectedIds([]);
      }

      setError(null);
    }
  }, [open, group, existingGroups]);

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(tGroup("errorNameRequired"));
      return;
    }

    const isDuplicate = existingGroups.some(
      (g) => g.name.toLowerCase() === trimmedName.toLowerCase() && g.id !== group?.id
    );
    if (isDuplicate) {
      setError(tGroup("errorNameExists"));
      return;
    }


    if (selectedIds.length === 0) {
      setError(tGroup("errorMemberRequired"));
      return;
    }

    setIsLoading(true);
    setError(null);

    let res;
    if (isEdit) {
      res = await updateGroup({
        groupId: group.id,
        eventId,
        name: trimmedName,
        participantIds: selectedIds,
      });
    } else {
      res = await createGroup({
        eventId,
        name: trimmedName,
        participantIds: selectedIds,
      });
    }

    setIsLoading(false);
    if (!res.success) {
      setError(res.error || (isEdit ? tGroup("errorUpdate") : tGroup("errorCreate")));
    } else {
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!group) return;
    if (confirm(tGroup("deleteConfirm"))) {
      setIsLoading(true);
      setError(null);
      const res = await deleteGroup(group.id, eventId);
      setIsLoading(false);
      
      if (!res.success) {
        setError(res.error || tGroup("errorDelete"));
      } else {
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-3xl p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="text-2xl font-normal text-slate-900 text-center">
            <input 
              type="text" 
              placeholder={tGroup("groupNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              maxLength={50}
              className="w-full text-center bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-300 font-normal p-0"
            />
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-0 flex flex-col gap-5 flex-1 min-h-0">
          {error && <p className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded-lg text-center">{error}</p>}


          <div className="space-y-1.5 flex flex-col flex-1 min-h-0">
            <label className="text-sm font-medium text-slate-700 flex justify-between shrink-0">
              {tGroup("membersCount", { count: selectedIds.length })}
            </label>
            <div className="space-y-3 overflow-y-auto scrollbar-hide flex-1 pb-2 pt-1">
              {participants.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                const isMe = isCurrentParticipant(p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-3 sm:p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${isSelected ? "bg-white border-blue-200 ring-1 ring-blue-100" : "bg-white border-slate-200/80"}`}
                    onClick={() => toggleOne(p.id)}
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-sm ${
                        isMe ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200" : isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {isMe ? <User size={18} /> : p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`text-sm sm:text-base truncate ${isSelected ? "text-slate-900 font-bold" : "text-slate-600 font-medium"}`}>
                        {p.name}
                      </div>
                    </div>

                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(p.id)}
                      id={`group-member-${p.id}`}
                      className="rounded-full data-[state=checked]:bg-blue-600 border-slate-300 w-5 h-5 shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-6 pb-6 pt-2 border-t border-slate-100 bg-white shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] sm:rounded-b-3xl">
          <Button onClick={handleSave} disabled={isLoading} className="w-full h-12 rounded-full font-medium active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-base">
            {isLoading ? tGroup("processing") : tGroup("save")}
          </Button>
          {isEdit && (
            <Button onClick={handleDelete} disabled={isLoading} variant="ghost" className="w-full h-12 rounded-full font-medium text-red-600 hover:text-red-700 hover:bg-red-50 text-base border-none">
              {tGroup("deleteGroup")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
