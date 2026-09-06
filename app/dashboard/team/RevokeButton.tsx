'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function RevokeButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const handleRevoke = async () => {
    if (!window.confirm('Revoke this invitation?')) return;

    setError(null);
    setIsRevoking(true);
    const { error: revokeError } = await supabase.rpc('revoke_business_invitation', {
      p_invitation_id: invitationId,
    });

    if (revokeError) {
      setError(revokeError.message || 'Unable to revoke invitation.');
      setIsRevoking(false);
      return;
    }

    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleRevoke}
        disabled={isRevoking}
        className="min-h-[36px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {isRevoking ? 'Revoking...' : 'Revoke'}
      </button>
      {error && <span className="max-w-[220px] text-xs text-warn-700">{error}</span>}
    </div>
  );
}
