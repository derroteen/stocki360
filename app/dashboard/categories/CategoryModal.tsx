'use client';

import { useRef, useState } from 'react';
import { Category } from '@/lib/supabase/types';
import FormField from '@/components/forms/FormField';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { focusFirstInvalid, validateFields, type FormErrors } from '@/components/forms/validation';

const FIELD_LABELS = { 'category-name': 'Category name' };

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onSaveSuccess: () => void;
}

export default function CategoryModal({
  isOpen,
  onClose,
  category,
  onSaveSuccess,
}: CategoryModalProps) {
  if (!isOpen) return null;

  return (
    <CategoryModalForm
      key={category?.id ?? 'new'}
      onClose={onClose}
      category={category}
      onSaveSuccess={onSaveSuccess}
    />
  );
}

function CategoryModalForm({
  onClose,
  category,
  onSaveSuccess,
}: Omit<CategoryModalProps, 'isOpen'>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const submittingRef = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');

  const isEditing = !!category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const errors = validateFields([
      { id: 'category-name', label: 'Category name', value: name, required: true },
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
      const payload = {
        name: name.trim(),
        description,
      };

      const url = isEditing ? `/api/categories/${category.id}` : '/api/categories';
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      window.setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-overlay/40 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />
      <div
        className="relative bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-full border border-line"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line-subtle bg-subtle/50">
          <h2 className="text-lg font-bold text-ink-900 font-serif">
            {isEditing ? 'Edit Category' : 'Add Category'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 -mr-2 text-ink-400 hover:text-ink-600 rounded-full hover:bg-subtle-strong transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form id="category-form" noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <FormField id="category-name" label="Category name" required error={fieldErrors['category-name']}>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) {
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next['category-name'];
                    return next;
                  });
                }
              }}
              placeholder="e.g. Electronics"
              className="w-full px-3 py-2 border border-line-strong rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-colors sm:text-sm text-base min-h-[44px]"
            />
          </FormField>

          <div className="space-y-1">
            <label htmlFor="category-description" className="block text-sm font-semibold text-ink-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the category..."
              className="w-full px-3 py-2 border border-line-strong rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-colors sm:text-sm text-base min-h-[88px] resize-y"
            />
          </div>
        </form>

        <div ref={summaryRef} className="sticky bottom-0 z-10 border-t border-line-subtle bg-subtle px-6 py-4">
          <FormErrorSummary errors={fieldErrors} labels={FIELD_LABELS} serverError={error} />
          <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-ink-600 bg-card border border-line-strong hover:bg-subtle rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="category-form"
            disabled={isSubmitting}
            className="min-h-[44px] px-5 py-2 text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 border border-transparent rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Category'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
