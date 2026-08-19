'use client';

import { FormEvent, useState } from 'react';

export default function CreateBusinessOnboarding() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const data = (await response.json().catch(() => null)) as { businessId?: string; error?: string } | null;

      if (!response.ok || !data?.businessId) {
        setError(data?.error ?? 'Unable to create business.');
        return;
      }

      window.location.assign('/dashboard');
    } catch {
      setError('Unable to create business. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-ink-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-surface p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-bold text-ink-900">Create your first business</h1>
          <p className="text-sm text-ink-600">Start by creating a business to access your dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="business-name" className="text-sm font-medium text-ink-800">
              Business name
            </label>
            <input
              id="business-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Trading Co."
              className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
              disabled={isSubmitting}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
