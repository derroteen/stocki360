'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { GUIDE_STEPS } from '@/lib/guide-steps';
import type { BusinessRole } from '@/lib/supabase/business-context';

export interface SetupProgress {
  categories: number;
  suppliers: number;
  products: number;
  purchases: number;
  stockMovements: number;
  sales: number;
  productsWithReorderLevel: number;
  activeMembers: number;
}

const STORAGE_PREFIX = 'stocki360.setup-checklist-hidden.';
const CHANGE_EVENT = 'stocki360:setup-checklist-change';
const memoryValues = new Map<string, boolean>();

function storageKey(businessId: string) {
  return `${STORAGE_PREFIX}${businessId}`;
}

function getHidden(businessId: string): boolean {
  if (typeof window === 'undefined') return false;
  const key = storageKey(businessId);
  if (memoryValues.has(key)) return memoryValues.get(key) ?? false;

  try {
    return window.localStorage.getItem(key) === 'true';
  } catch (error) {
    console.warn('Unable to read the setup checklist preference from local storage.', error);
    return false;
  }
}

function subscribeToHidden(businessId: string, callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey(businessId) || event.key === null) callback();
  };
  const onChange = (event: Event) => {
    if ((event as CustomEvent<string>).detail === businessId) callback();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function setHidden(businessId: string, hidden: boolean) {
  const key = storageKey(businessId);
  memoryValues.set(key, hidden);
  try {
    if (hidden) {
      window.localStorage.setItem(key, 'true');
    } else {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Unable to save the setup checklist preference to local storage.', error);
    // Keep the preference in memory when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: businessId }));
}

const serverSnapshot = () => false;

const requiredStepIds = GUIDE_STEPS.filter((step) => !step.optional).map((step) => step.id);

function isStepDone(stepId: string, progress: SetupProgress) {
  switch (stepId) {
    case 'business':
      return true;
    case 'categories':
      return progress.categories > 0;
    case 'suppliers':
      return progress.suppliers > 0;
    case 'products':
      return progress.products > 0;
    case 'add-stock':
      return progress.purchases > 0 || progress.stockMovements > 0;
    case 'first-sale':
      return progress.sales > 0;
    case 'low-stock-alerts':
      return progress.productsWithReorderLevel > 0;
    case 'invite-team':
      return progress.activeMembers > 1;
    default:
      return false;
  }
}

function HowToMakeSaleCard() {
  return (
    <section className="rounded-xl border border-line bg-panel p-4 shadow-2xs sm:p-5">
      <h2 className="text-base font-bold text-ink-900 font-serif">How to make a sale</h2>
      <p className="mt-1 text-sm text-ink-600">
        Choose an in-stock product, enter the quantity and payment method, then record the sale.
      </p>
      <Link
        href="/dashboard/sales"
        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-line-strong bg-card px-4 text-sm font-semibold text-ink-700 hover:bg-subtle"
      >
        Go to Sales
      </Link>
    </section>
  );
}

export default function SetupChecklist({
  businessId,
  role,
  progress,
}: {
  businessId: string;
  role: BusinessRole;
  progress: SetupProgress;
}) {
  const hidden = useSyncExternalStore(
    (callback) => subscribeToHidden(businessId, callback),
    () => getHidden(businessId),
    serverSnapshot
  );

  if (role === 'cashier') return <HowToMakeSaleCard />;

  const requiredDone = requiredStepIds.filter((stepId) => isStepDone(stepId, progress)).length;
  const isComplete = requiredDone === requiredStepIds.length;

  if (isComplete) {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink-700 shadow-2xs">
        <span className="font-semibold text-ink-900">Setup complete.</span>
        <Link
          href="/dashboard/guide"
          className="inline-flex min-h-[44px] items-center font-semibold text-accent-text underline underline-offset-2"
        >
          View the guide
        </Link>
      </p>
    );
  }

  if (hidden) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel px-4 py-2 text-sm text-ink-600 shadow-2xs">
        <span>Setup checklist is hidden.</span>
        <button
          type="button"
          onClick={() => setHidden(businessId, false)}
          className="min-h-[44px] rounded-lg px-3 font-semibold text-accent-text hover:bg-subtle-strong"
        >
          Show checklist
        </button>
      </div>
    );
  }

  const nextRequiredStep = GUIDE_STEPS.find(
    (step) => !step.optional && !isStepDone(step.id, progress)
  );

  return (
    <section className="rounded-xl border border-line bg-panel p-4 shadow-2xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-ink-900 font-serif">Setup checklist</h2>
            <span className="text-xs font-medium text-ink-500">
              {requiredDone} of {requiredStepIds.length} done
            </span>
          </div>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-subtle-strong"
            role="progressbar"
            aria-label="Required setup progress"
            aria-valuemin={0}
            aria-valuemax={requiredStepIds.length}
            aria-valuenow={requiredDone}
          >
            <div
              className="h-full rounded-full bg-accent-500 transition-[width]"
              style={{ width: `${(requiredDone / requiredStepIds.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Link
            href="/dashboard/guide"
            className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold text-accent-text hover:bg-subtle-strong"
          >
            Guide
          </Link>
          <button
            type="button"
            onClick={() => setHidden(businessId, true)}
            className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-ink-600 hover:bg-subtle-strong"
          >
            Hide
          </button>
        </div>
      </div>

      <ol className="mt-4 divide-y divide-line-subtle">
        {GUIDE_STEPS.map((step) => {
          const done = isStepDone(step.id, progress);
          const isNext = !done && nextRequiredStep?.id === step.id;

          return (
            <li
              key={step.id}
              className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${
                isNext ? 'rounded-lg bg-subtle px-3' : ''
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-label={done ? 'Done' : 'Not done'}
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    done
                      ? 'border-good-600/30 bg-good-100 text-good-700'
                      : 'border-line-strong bg-card text-ink-500'
                  }`}
                >
                  {done ? '✓' : ''}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink-900">{step.title}</h3>
                    {step.optional && (
                      <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-ink-500">
                        Optional
                      </span>
                    )}
                    {isNext && (
                      <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-semibold text-accent-text">
                        Next
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 break-words text-xs text-ink-600">{step.whyItMatters}</p>
                </div>
              </div>
              <Link
                href={step.href}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center self-start rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-ink-700 hover:bg-subtle-strong sm:self-center"
              >
                {step.actionLabel}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function ShowSetupChecklistButton({ businessId }: { businessId: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        setHidden(businessId, false);
        router.push('/dashboard');
      }}
      className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-accent-600 px-4 text-sm font-semibold text-white hover:bg-accent-700"
    >
      Show setup checklist again
    </button>
  );
}
