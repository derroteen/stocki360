'use client';

import { useEffect, useState } from 'react';
import AcceptInviteButton from './AcceptInviteButton';

interface InvitationBannerProps {
  invitationId: string;
  businessName: string;
  role: string;
}

export default function InvitationBanner({ invitationId, businessName, role }: InvitationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(sessionStorage.getItem(`stocki360-invitation-dismissed-${invitationId}`) === 'true');
  }, [invitationId]);

  if (isDismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(`stocki360-invitation-dismissed-${invitationId}`, 'true');
    setIsDismissed(true);
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
