"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import ClaimIdentityModal from "@/components/event/ClaimIdentityModal";
import { useParticipantIdentity } from "@/hooks/useParticipantIdentity";

type IdentityContextType = {
  requireIdentity: (actionCallback: () => void) => void;
};

const IdentityContext = createContext<IdentityContextType | null>(null);

export const useIdentity = () => {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error("useIdentity must be used within an IdentityProvider");
  }
  return context;
};

type Props = {
  eventId: string;
  participants: any[];
  children: React.ReactNode;
  hasPasscode?: boolean;
  currentUserName?: string;
};

export function IdentityProvider({ eventId, participants, children, hasPasscode, currentUserName }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  
  const { needsIdentityClaim } = useParticipantIdentity(participants);

  const requireIdentity = useCallback(
    (actionCallback: () => void) => {
      if (!needsIdentityClaim) {
        // Zero-Delay execution
        actionCallback();
        return;
      }
      
      // Need to claim identity
      pendingActionRef.current = actionCallback;
      setIsModalOpen(true);
    },
    [needsIdentityClaim]
  );

  const handleClose = () => {
    setIsModalOpen(false);
    pendingActionRef.current = null; // Cleanup State
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    if (pendingActionRef.current) {
      pendingActionRef.current();
      pendingActionRef.current = null;
    }
  };

  return (
    <IdentityContext.Provider value={{ requireIdentity }}>
      {children}
      <ClaimIdentityModal
        eventId={eventId}
        participants={participants}
        hasPasscode={hasPasscode}
        currentUserName={currentUserName}
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </IdentityContext.Provider>
  );
}
