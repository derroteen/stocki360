'use client';

import { useSyncExternalStore } from 'react';
import AcceptInviteButton from './AcceptInviteButton';

interface InvitationBannerProps {
  invitationId: string;
  businessName: string;
  role: string;
}

const INVITATION_DISMISSED_EVENT = 'stocki360-invitation-dismissed';

function getDismissalStorageKey(invitationId: string) {
  return `stocki360-invitation-dismissed-${invitationId}`;
}

function subscribeToDismissal(invitationId: string, onStoreChange: () => void) {
  const handleDismissal = (event: Event) => {
    if ((event as CustomEvent<string>).detail === invitationId) {
      onStoreChange();
    }
  };

  window.addEventListener(INVITATION_DISMISSED_EVENT, handleDismissal);
  return () => window.removeEventListener(INVITATION_DISMISSED_EVENT, handleDismissal);
}

export default function InvitationBanner({ invitationId, businessName, role }: InvitationBannerProps) {
  const isDismissed = useSyncExternalStore(
    (onStoreChange) => subscribeToDismissal(invitationId, onStoreChange),
    () => sessionStorage.getItem(getDismissalStorageKey(invitationId)) === 'true',
    () => false,
  );

  if (isDismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(getDismissalStorageKey(invitationId), 'true');
    window.dispatchEvent(new CustomEvent(INVITATION_DISMISSED_EVENT, { detail: invitationId }));
  };

  return (
    <div className="border-b border-accent-700 bg-accent-600 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="text-sm font-medium">
          You&apos;ve been invited to join {businessName} as {role}.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <AcceptInviteButton invitationId={invitationId} />
          <button
            type="button"
            onClick={dismiss}
            className="min-h-[36px] min-w-[36px] rounded-lg px-2 text-lg text-white/80 hover:bg-accent-700 hover:text-white"
            aria-label="Dismiss invitation"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
