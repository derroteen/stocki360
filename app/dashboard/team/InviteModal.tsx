'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface InviteModalProps {
  businessId: string;
}

type InviteRole = 'admin' | 'storekeeper' | 'cashier';

export default function InviteModal({ businessId }: InviteModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('storekeeper');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const close = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setError(null);
    setEmail('');
    setRole('storekeeper');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: invitationError } = await supabase.rpc('create_business_invitation', {
      p_business_id: businessId,
      p_email: email.trim(),
      p_role: role,
    });

    if (invitationError) {
      setError(invitationError.message || 'Unable to send invitation.');
      setIsSubmitting(false);
      return;
    }

    close();
    router.refresh();
    setIsSubmitting(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="min-h-[44px] rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700"
      >
        Invite member
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-serif text-ink-900">Invite member</h2>
                <p className="mt-1 text-sm text-ink-500">Send access to a teammate by email.</p>
              </div>
              <button type="button" onClick={close} className="min-h-[44px] min-w-[44px] text-xl text-ink-500" aria-label="Close">
                ×
              </button>
            </div>

            {error && <p className="mb-4 rounded-lg border border-warn-200 bg-warn-50 p-3 text-sm text-warn-700">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-ink-700">Email</label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-ink-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="teammate@example.com"
                />
              </div>
              <div>
                <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-ink-700">Role</label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as InviteRole)}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-ink-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="admin">Admin</option>
                  <option value="storekeeper">Storekeeper</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={close} disabled={isSubmitting} className="min-h-[44px] rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-slate-200 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="min-h-[44px] rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50">{isSubmitting ? 'Sending...' : 'Send invite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
