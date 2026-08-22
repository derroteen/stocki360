'use client';

import { useState, useEffect } from 'react';
import { Supplier } from '@/lib/supabase/types';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSaveSuccess: () => void;
}

export default function SupplierModal({
  isOpen,
  onClose,
  supplier,
  onSaveSuccess,
}: SupplierModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const isEditing = !!supplier;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName(supplier?.name ?? '');
      setContactPerson(supplier?.contact_person ?? '');
      setPhone(supplier?.phone ?? '');
      setEmail(supplier?.email ?? '');
      setAddress(supplier?.address ?? '');
      setNotes(supplier?.notes ?? '');
    }
  }, [isOpen, supplier]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        contact_person: contactPerson,
        phone,
        email,
        address,
        notes,
      };

      const url = isEditing ? `/api/suppliers/${supplier.id}` : '/api/suppliers';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'An unexpected error occurred.');
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-full border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-ink-900 font-serif">
            {isEditing ? 'Edit Supplier' : 'Add Supplier'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 -mr-2 text-ink-400 hover:text-ink-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-sm text-warn-700 bg-warn-50 border border-warn-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="supplier-name" className="block text-sm font-semibold text-ink-700 mb-1.5">
              Supplier name *
            </label>
            <input
              id="supplier-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-colors sm:text-sm text-base min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-person" className="block text-sm font-semibold text-ink-700 mb-1.5">
                Contact Person
              </label>
              <input
                id="contact-person"
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-colors sm:text-sm text-base min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-ink-700 mb-1.5">
                Phone
              </label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-colors sm:text-sm text-base min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-ink-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="supplier@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-colors sm:text-sm text-base min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-ink-700 mb-1.5">
              Address
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Industrial Area..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-colors sm:text-sm text-base min-h-[66px] resize-y"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-ink-700 mb-1.5">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-colors sm:text-sm text-base min-h-[66px] resize-y"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-ink-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            onClick={handleSubmit}
            className="min-h-[44px] px-5 py-2 text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 border border-transparent rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}
