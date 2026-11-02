'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import FormField from '@/components/forms/FormField';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { clearValidFieldError, focusFirstInvalid, validateFields, type FormErrors } from '@/components/forms/validation';

const FIELD_LABELS = { 'invite-email': 'Email', 'invite-role': 'Role' };

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
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const submittingRef = useRef(false);
  const supabase = createSupabaseBrowserClient();

  const close = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setError(null);
    setFieldErrors({});
    setEmail('');
    setRole('storekeeper');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const errors = validateFields([
      { id: 'invite-email', label: 'Email', value: email, required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      { id: 'invite-role', label: 'Role', value: role, required: true },
    ]);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(errors);
      return;
    }
    setError(null);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const { error: invitationError } = await supabase.rpc('create_business_invitation', {
        p_business_id: businessId,
        p_email: email.trim(),
        p_role: role,
      });

      if (invitationError) {
        setError(invitationError.message || 'Unable to send invitation.');
        document.getElementById('invite-error-summary')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      setIsOpen(false);
      setFieldErrors({});
      setEmail('');
      setRole('storekeeper');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to send invitation.');
      document.getElementById('invite-error-summary')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setFieldErrors({});
          setIsOpen(true);
        }}
        className="min-h-[44px] rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700"
      >
        Invite member
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-line bg-card p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-serif text-ink-900">Invite member</h2>
                <p className="mt-1 text-sm text-ink-500">Send access to a teammate by email.</p>
              </div>
              <button type="button" onClick={close} className="min-h-[44px] min-w-[44px] text-xl text-ink-500" aria-label="Close">
                ×
              </button>
            </div>

            <form id="invite-form" noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1">
              <FormField id="invite-email" label="Email" required error={fieldErrors['invite-email']}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    const value = event.target.value;
                    setEmail(value);
                    setFieldErrors((current) => clearValidFieldError(current, 'invite-email', { id: 'invite-email', label: 'Email', value, required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }));
                  }}
                  className="min-h-[44px] w-full rounded-lg border border-line-strong px-3 py-2 text-ink-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="teammate@example.com"
                />
              </FormField>
              <FormField id="invite-role" label="Role" required error={fieldErrors['invite-role']}>
                <select
                  value={role}
                  onChange={(event) => {
                    const value = event.target.value as InviteRole;
                    setRole(value);
                    setFieldErrors((current) => clearValidFieldError(current, 'invite-role', { id: 'invite-role', label: 'Role', value, required: true }));
                  }}
                  className="min-h-[44px] w-full rounded-lg border border-line-strong bg-card px-3 py-2 text-ink-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="admin">Admin</option>
                  <option value="storekeeper">Storekeeper</option>
                  <option value="cashier">Cashier</option>
                </select>
              </FormField>
              </div>
              <div id="invite-error-summary" className="sticky bottom-0 mt-4 border-t border-line bg-card pt-3">
                <FormErrorSummary errors={fieldErrors} labels={FIELD_LABELS} serverError={error} />
                <div className="flex justify-end gap-3">
                <button type="button" onClick={close} disabled={isSubmitting} className="min-h-[44px] rounded-lg bg-subtle-strong px-4 py-2 text-sm font-medium text-ink-700 hover:bg-subtle-active disabled:opacity-50">Cancel</button>
                <button type="submit" form="invite-form" disabled={isSubmitting} className="min-h-[44px] rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50">{isSubmitting ? 'Sending...' : 'Send invite'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
