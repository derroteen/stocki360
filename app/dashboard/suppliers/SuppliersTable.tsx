'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Supplier } from '@/lib/supabase/types';
import SupplierModal from './SupplierModal';
import ConfirmDialog from '@/components/ConfirmDialog';

import Link from 'next/link';

interface SuppliersTableProps {
  // All suppliers for this business (active + archived), sorted by name.
  suppliers: Supplier[];
  stats?: Record<string, { orderCount: number; totalAmount: number }>;
}

type ViewFilter = 'active' | 'archived';

export default function SuppliersTable({ suppliers, stats = {} }: SuppliersTableProps) {
  const router = useRouter();

  // Tab state: show active suppliers by default.
  const [view, setView] = useState<ViewFilter>('active');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // State for confirm dialog (archive or restore)
  const [confirmTarget, setConfirmTarget] = useState<{
    supplier: Supplier;
    action: 'archive' | 'restore';
  } | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Split into active and archived for tab counts and filtered views.
  const activeSuppliers = suppliers.filter((s) => s.is_active);
  const archivedSuppliers = suppliers.filter((s) => !s.is_active);
  const visibleSuppliers = view === 'active' ? activeSuppliers : archivedSuppliers;

  const handleAddSupplier = () => {
    setActionError(null);
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  // Open the edit modal. Archived suppliers can still be edited.
  const handleEditSupplier = (supplier: Supplier) => {
    setActionError(null);
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
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

    const { supplier, action } = confirmTarget;
    const label = action === 'archive' ? 'archive' : 'restore';

    setActionError(null);
    setIsActionSubmitting(true);

    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Unable to ${label} supplier.`);
      }

      setConfirmTarget(null);
      router.refresh();
    } catch (error: any) {
      setActionError(error?.message ?? `Unable to ${label} supplier.`);
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
            <h1 className="text-2xl font-bold text-ink-900 font-serif">Suppliers</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-50 text-accent-700 border border-accent-100">
              {activeSuppliers.length} active
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-1">
            Manage your product suppliers and contact information.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleAddSupplier}
            className="min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm cursor-pointer"
          >
            <span className="text-lg leading-none">+</span> Add supplier
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
          Active ({activeSuppliers.length})
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
          Archived ({archivedSuppliers.length})
        </button>
      </div>

      {/* Inline error banner */}
      {actionError && (
        <div className="p-3 text-sm text-warn-700 bg-warn-100 border border-warn-600/30 rounded-lg">
          {actionError}
        </div>
      )}

      {/* Empty state */}
      {visibleSuppliers.length === 0 ? (
        <div className="bg-surface border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-accent-50 text-accent-500 border border-accent-100 flex items-center justify-center mx-auto text-xl font-serif font-bold">
            S
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-ink-900 font-serif">
              {view === 'active' ? 'No active suppliers' : 'No archived suppliers'}
            </h3>
            <p className="text-sm text-ink-500 max-w-sm mx-auto">
              {view === 'active'
                ? 'Keep track of where you source your products by adding suppliers.'
                : 'Archived suppliers will appear here. You can restore them at any time.'}
            </p>
          </div>
          {view === 'active' && (
            <button
              type="button"
              onClick={handleAddSupplier}
              className="min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium shadow-sm transition-colors text-sm cursor-pointer"
            >
              <span className="text-lg leading-none">+</span> Add supplier
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
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Phone & Email</th>
                  <th className="py-3.5 px-4 text-center">Purchases</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-ink-900">
                {visibleSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    onClick={() => handleEditSupplier(supplier)}
                    className="cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium text-ink-900">
                      {supplier.name}
                    </td>
                    <td className="py-4 px-4 text-ink-600">
                      {supplier.contact_person || '-'}
                    </td>
                    <td className="py-4 px-4 text-ink-600 space-y-1 text-xs">
                      {supplier.phone && <div className="block">{supplier.phone}</div>}
                      {supplier.email && <div className="block">{supplier.email}</div>}
                      {!supplier.phone && !supplier.email && <span>-</span>}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {stats[supplier.id]?.orderCount ? (
                        <Link
                          href={`/dashboard/purchases`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-50 text-accent-700 hover:bg-accent-100 transition-colors border border-accent-100"
                        >
                          {stats[supplier.id].orderCount} {stats[supplier.id].orderCount === 1 ? 'order' : 'orders'}
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-400">0 orders</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {view === 'active' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionError(null);
                            setConfirmTarget({ supplier, action: 'archive' });
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
                            setConfirmTarget({ supplier, action: 'restore' });
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
            {visibleSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                onClick={() => handleEditSupplier(supplier)}
                className="bg-surface border border-slate-200 rounded-xl p-4 min-h-[44px] space-y-3 cursor-pointer hover:border-accent-500/50 active:bg-slate-100 transition-all"
              >
                <div>
                  <h4 className="font-semibold text-ink-900 text-base">
                    {supplier.name}
                  </h4>
                  {supplier.contact_person && (
                    <p className="text-ink-600 text-sm mt-1">{supplier.contact_person}</p>
                  )}
                  <div className="text-ink-500 text-xs mt-2 space-y-1">
                    {supplier.phone && <div>{supplier.phone}</div>}
                    {supplier.email && <div>{supplier.email}</div>}
                  </div>
                  {stats[supplier.id]?.orderCount ? (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-700 border border-accent-100">
                        {stats[supplier.id].orderCount} {stats[supplier.id].orderCount === 1 ? 'purchase order' : 'purchase orders'}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-200/60">
                  {view === 'active' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionError(null);
                        setConfirmTarget({ supplier, action: 'archive' });
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
                        setConfirmTarget({ supplier, action: 'restore' });
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

      {/* Edit/Create Supplier Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplier={selectedSupplier}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Confirmation Dialog for Archive / Restore */}
      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={
          confirmTarget?.action === 'archive'
            ? 'Archive supplier?'
            : 'Restore supplier?'
        }
        description={
          confirmTarget?.action === 'archive'
            ? 'This supplier will be moved to Archived and can be restored later.'
            : 'This supplier will be moved back to Active and can be selected for products.'
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
