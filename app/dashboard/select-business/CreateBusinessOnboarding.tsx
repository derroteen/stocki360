'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormField from '@/components/forms/FormField';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { focusFirstInvalid, validateFields, type FormErrors } from '@/components/forms/validation';

const FIELD_LABELS = { 'business-name': 'Business name' };

export default function CreateBusinessOnboarding() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const submittingRef = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submittingRef.current) return;

    const errors = validateFields([
      { id: 'business-name', label: 'Business name', value: name, required: true },
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
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = (await response.json().catch(() => null)) as { businessId?: string; error?: string } | null;

      if (!response.ok || !data?.businessId) {
        setError(data?.error ?? 'Unable to create business.');
        window.setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Unable to create business. Please try again.');
      window.setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-card text-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-line bg-panel p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-bold text-ink-900">Create your first business</h1>
          <p className="text-sm text-ink-600">Start by creating a business to access your dashboard.</p>
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <FormField id="business-name" label="Business name" required error={fieldErrors['business-name']}>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (event.target.value.trim()) setFieldErrors({});
              }}
              placeholder="Acme Trading Co."
              className="w-full min-h-[44px] rounded-lg border border-line-strong px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
              disabled={isSubmitting}
            />
          </FormField>

          <div ref={summaryRef}>
            <FormErrorSummary errors={fieldErrors} labels={FIELD_LABELS} serverError={error} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating...' : 'Create business'}
          </button>
        </form>
      </div>
    </div>
  );
}
