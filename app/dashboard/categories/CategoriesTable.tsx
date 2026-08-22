'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Category } from '@/lib/supabase/types';
import CategoryModal from './CategoryModal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface CategoriesTableProps {
  // All categories for this business (active + archived), sorted by name.
  categories: Category[];
}

type ViewFilter = 'active' | 'archived';

export default function CategoriesTable({ categories }: CategoriesTableProps) {
  const router = useRouter();

  // Tab state: show active categories by default.
  const [view, setView] = useState<ViewFilter>('active');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // State for confirm dialog (archive or restore)
  const [confirmTarget, setConfirmTarget] = useState<{
    category: Category;
    action: 'archive' | 'restore';
  } | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Split into active and archived for the tab counts and filtered views.
  const activeCategories = categories.filter((c) => c.is_active);
  const archivedCategories = categories.filter((c) => !c.is_active);
  const visibleCategories = view === 'active' ? activeCategories : archivedCategories;

  const handleAddCategory = () => {
    setActionError(null);
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  // Open the edit modal. Archived categories can still be edited (name/description).
  const handleEditCategory = (category: Category) => {
    setActionError(null);
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleSaveSuccess = () => {
    setActionError(null);
    router.refresh();
  };

  /**
   * Execute the archive or restore PATCH request upon confirmation in the ConfirmDialog.
   */
  const handleConfirmAction = async () => {
    if (!confirmTarget || isActionSubmitting) return;

    const { category, action } = confirmTarget;
    const label = action === 'archive' ? 'archive' : 'restore';

    setActionError(null);
    setIsActionSubmitting(true);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Unable to ${label} category.`);
      }

      setConfirmTarget(null);
      router.refresh();
    } catch (error: any) {
      setActionError(error?.message ?? `Unable to ${label} category.`);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink-900 font-serif">Categories</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-50 text-accent-700 border border-accent-100">
              {activeCategories.length} active
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-1">
            Organize your products into categories.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleAddCategory}
            className="min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm cursor-pointer"
          >
            <span className="text-lg leading-none">+</span> Add category
          </button>
        </div>
      </div>

      {/* Active / Archived tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setView('active')}
          className={`min-h-[36px] px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            view === 'active'
              ? 'bg-white text-ink-900 shadow-xs'
              : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          Active ({activeCategories.length})
        </button>
        <button
          type="button"
          onClick={() => setView('archived')}
          className={`min-h-[36px] px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            view === 'archived'
              ? 'bg-white text-ink-900 shadow-xs'
              : 'text-ink-500 hover:text-ink-700'
          }`}
        >
          Archived ({archivedCategories.length})
        </button>
      </div>

      {/* Inline error banner */}
      {actionError && (
        <div className="p-3 text-sm text-warn-700 bg-warn-100 border border-warn-600/30 rounded-lg">
          {actionError}
        </div>
      )}

      {/* Empty state */}
      {visibleCategories.length === 0 ? (
        <div className="bg-surface border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-accent-50 text-accent-500 border border-accent-100 flex items-center justify-center mx-auto text-xl font-serif font-bold">
            C
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-ink-900 font-serif">
              {view === 'active' ? 'No active categories' : 'No archived categories'}
            </h3>
            <p className="text-sm text-ink-500 max-w-sm mx-auto">
              {view === 'active'
                ? "You haven't added any categories yet. Create categories to better organize your inventory."
                : 'Archived categories will appear here. You can restore them at any time.'}
            </p>
          </div>
          {view === 'active' && (
            <button
              type="button"
              onClick={handleAddCategory}
              className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm cursor-pointer"
            >
              <span className="text-lg leading-none">+</span> Add category
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-hidden bg-surface border border-slate-200 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-surface text-ink-700 font-medium">
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-ink-900">
                {visibleCategories.map((category) => (
                  <tr
                    key={category.id}
                    onClick={() => handleEditCategory(category)}
                    className="cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium text-ink-900">
                      {category.name}
                    </td>
                    <td className="py-4 px-4 text-ink-600 truncate max-w-sm">
                      {category.description || '-'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {view === 'active' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionError(null);
                            setConfirmTarget({ category, action: 'archive' });
                          }}
                          className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-warn-700 bg-warn-50 hover:bg-warn-100 border border-warn-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionError(null);
                            setConfirmTarget({ category, action: 'restore' });
                          }}
                          className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="block sm:hidden space-y-3">
            {visibleCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleEditCategory(category)}
                className="bg-surface border border-slate-200 rounded-xl p-4 min-h-[44px] space-y-3 cursor-pointer hover:border-accent-500/50 active:bg-slate-100 transition-all"
              >
                <div>
                  <h4 className="font-semibold text-ink-900 text-base">
                    {category.name}
                  </h4>
                  {category.description && (
                    <p className="text-ink-600 text-sm mt-1">{category.description}</p>
                  )}
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-200/60">
                  {view === 'active' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionError(null);
                        setConfirmTarget({ category, action: 'archive' });
                      }}
                      className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-warn-700 bg-warn-50 hover:bg-warn-100 border border-warn-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionError(null);
                        setConfirmTarget({ category, action: 'restore' });
                      }}
                      className="min-h-[44px] px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit/Create Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        category={selectedCategory}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Confirmation Dialog for Archive / Restore */}
      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={
          confirmTarget?.action === 'archive'
            ? 'Archive category?'
            : 'Restore category?'
        }
        description={
          confirmTarget?.action === 'archive'
            ? 'This category will be moved to Archived and can be restored later.'
            : 'This category will be moved back to Active and can be selected for products.'
        }
        confirmLabel={confirmTarget?.action === 'archive' ? 'Archive' : 'Restore'}
        cancelLabel="Cancel"
        variant={confirmTarget?.action === 'archive' ? 'warning' : 'default'}
        loading={isActionSubmitting}
        onConfirm={handleConfirmAction}
        onCancel={() => !isActionSubmitting && setConfirmTarget(null)}
      />
    </div>
  );
}
