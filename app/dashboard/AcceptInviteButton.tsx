'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AcceptInviteButton({ invitationId }: { invitationId: string }) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const handleAccept = async () => {
    setError(null);
    setIsAccepting(true);

    const { error: acceptError } = await supabase.rpc('accept_business_invitation', {
      p_invitation_id: invitationId,
    });

    if (acceptError) {
      setError(acceptError.message || 'Unable to accept invitation.');
      setIsAccepting(false);
      return;
    }

    window.location.reload();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleAccept}
        disabled={isAccepting}
        className="min-h-[36px] rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-accent-700 shadow-sm hover:bg-accent-50 disabled:opacity-60"
      >
        {isAccepting ? 'Accepting...' : 'Accept'}
      </button>
      {error && <span className="max-w-[260px] text-right text-xs text-white">{error}</span>}
    </div>
  );
}
