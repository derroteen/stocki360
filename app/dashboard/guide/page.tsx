import { redirect } from 'next/navigation';
import Link from 'next/link';
import { GUIDE_STEPS } from '@/lib/guide-steps';
import type { GuideStepId } from '@/lib/guide-steps';
import {
  getActiveBusinessResolution,
  PRODUCT_WRITE_ROLES,
  SALE_WRITE_ROLES,
  TEAM_MANAGE_ROLES,
} from '@/lib/supabase/business-context';
import { MANUAL_ADJUSTMENT_ROLES, OPENING_STOCK_ROLES } from '@/lib/supabase/stock-roles';
import type { BusinessRole } from '@/lib/supabase/business-context';
import { ShowSetupChecklistButton } from '../SetupChecklist';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Guide' };

const roleLabels: Record<BusinessRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  storekeeper: 'Storekeeper',
  cashier: 'Cashier',
};

const stepDetails: Record<
  GuideStepId,
  { whatItIs: string; whatToDo: string; example: string; commonMistake: string }
> = {
  business: {
    whatItIs: 'The business is the workspace that contains your inventory, activity, and team.',
    whatToDo: 'Create or select the business you want to work in before adding records.',
    example: 'Use your hardware shop name so its PVC Pipe 20mm stock and sales stay together.',
    commonMistake: 'Adding records before selecting the intended business.',
  },
  categories: {
    whatItIs: 'Categories group products so the catalog is easier to browse.',
    whatToDo: 'Create a category such as Plumbing, then assign related products to it.',
    example: 'Create "Plumbing" for PVC Pipe 20mm and other plumbing supplies.',
    commonMistake: 'Treating categories as required; products can be saved without one.',
  },
  suppliers: {
    whatItIs: 'Suppliers record where products are sourced from.',
    whatToDo: 'Add a supplier when you want its details available while recording purchases.',
    example: 'Add your pipe wholesaler and select it when receiving PVC Pipe 20mm.',
    commonMistake: 'Thinking every purchase needs a supplier; direct purchases can have none.',
  },
  products: {
    whatItIs: 'A product stores the name, product code (SKU), prices, unit, and reorder level for an item.',
    whatToDo: 'Add each item you intend to track or sell, and set its reorder level.',
    example: 'Add “PVC Pipe 20mm” with its product code (SKU), unit, prices, and a reorder level.',
    commonMistake: 'Expecting a new product to have stock; new products start at zero.',
  },
  'add-stock': {
    whatItIs: 'Opening stock records what is already on your shelves when you start tracking a product. Purchases record new stock arriving afterward.',
    whatToDo: 'Enter opening stock when adding a product. Use purchases for new stock, and use write-offs or stock counts to correct inventory.',
    example: 'Set 20 units as opening stock when adding a product, then record a purchase when 60 more arrive.',
    commonMistake: 'Using a write-off or stock count to record newly purchased stock.',
  },
  'first-sale': {
    whatItIs: 'A sale records products sold, quantities, payment method, and total.',
    whatToDo: 'Choose an in-stock product, enter a positive quantity, then record the sale.',
    example: 'Sell 3 PVC Pipe 20mm units from the 60 received and select the payment method.',
    commonMistake: 'Entering a quantity greater than the available stock.',
  },
  'low-stock-alerts': {
    whatItIs: 'A product reorder level is the threshold used to flag low or empty stock.',
    whatToDo: 'Set a positive reorder level on products you want to monitor.',
    example: 'Set the PVC Pipe 20mm reorder level to 10 so the shop can plan a refill.',
    commonMistake: 'Leaving the reorder level at zero when you expect a warning before stock runs out.',
  },
  'invite-team': {
    whatItIs: 'Team members work in the business with permissions determined by their role.',
    whatToDo: 'Invite a teammate and choose the role that matches their responsibilities.',
    example: 'Invite a storekeeper to maintain products and record purchases and stock movements.',
    commonMistake: 'Giving a role more write access than the teammate needs.',
  },
};

export default async function GuidePage() {
  const resolution = await getActiveBusinessResolution();

  if (!resolution.context) {
    redirect('/dashboard/select-business');
  }

  const businessId = resolution.context.businessId;
  const roles: BusinessRole[] = ['owner', 'admin', 'storekeeper', 'cashier'];
  const permissionRows: { label: string; allowedRoles: readonly BusinessRole[] }[] = [
    { label: 'Products, categories, and suppliers', allowedRoles: PRODUCT_WRITE_ROLES },
    { label: 'Purchases and opening stock', allowedRoles: OPENING_STOCK_ROLES },
    { label: 'Write-offs and stock counts', allowedRoles: MANUAL_ADJUSTMENT_ROLES },
    { label: 'Record sales', allowedRoles: SALE_WRITE_ROLES },
    { label: 'Manage team invitations', allowedRoles: TEAM_MANAGE_ROLES },
  ];
  const hasPermission = (
    allowedRoles: readonly BusinessRole[],
    role: BusinessRole
  ) => allowedRoles.includes(role);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-link">Getting started</p>
        <h1 className="text-3xl font-bold font-serif text-ink-900">Business setup guide</h1>
        <p className="max-w-3xl text-sm text-ink-600">
          Follow the steps in order. Categories and suppliers are useful, but optional.
        </p>
      </header>

      <ol className="space-y-4">
        {GUIDE_STEPS.map((step, index) => {
          const details = stepDetails[step.id];

          return (
            <li
              key={step.id}
              className="rounded-xl border border-line bg-panel p-4 shadow-2xs sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-card text-sm font-bold text-ink-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold font-serif text-ink-900">{step.title}</h2>
                      {step.optional && (
                        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-ink-500">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-600">{details.whatItIs}</p>
                  </div>
                </div>
                <Link
                  href={step.href}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-line-strong bg-card px-4 text-sm font-semibold text-ink-700 hover:bg-subtle-strong"
                >
                  {step.actionLabel}
                </Link>
              </div>
              <dl className="mt-4 grid gap-3 border-t border-line-subtle pt-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">What to do</dt>
                  <dd className="mt-1 text-sm text-ink-700">{details.whatToDo}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Hardware shop example</dt>
                  <dd className="mt-1 text-sm text-ink-700">{details.example}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Common mistake</dt>
                  <dd className="mt-1 text-sm text-ink-700">{details.commonMistake}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold font-serif text-ink-900">Role permissions</h2>
          <p className="mt-1 text-sm text-ink-600">
            These permissions reflect the product, stock, sales, and team checks in the app.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-panel shadow-2xs">
          <div
            className="overflow-x-auto overscroll-x-contain rounded-xl"
            tabIndex={0}
            role="region"
            aria-label="Role permissions"
          >
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-subtle text-xs uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Permission</th>
                  {roles.map((role) => (
                    <th key={role} className="px-4 py-3 font-semibold">{roleLabels[role]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle text-ink-700">
                {permissionRows.map(({ label, allowedRoles }) => (
                  <tr key={label}>
                    <th scope="row" className="px-4 py-3 font-medium text-ink-900">
                      {label}
                    </th>
                    {roles.map((role) => (
                      <td key={role} className="px-4 py-3">
                        {hasPermission(allowedRoles, role) ? 'Yes' : 'No'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-panel p-4 shadow-2xs sm:p-5">
        <h2 className="text-xl font-bold font-serif text-ink-900">Frequently asked questions</h2>
        <dl className="mt-3 divide-y divide-line-subtle">
          <div className="py-3">
            <dt className="font-semibold text-ink-900">Can I add a product without a category or supplier?</dt>
            <dd className="mt-1 text-sm text-ink-600">Yes. Both fields are optional.</dd>
          </div>
          <div className="py-3">
            <dt className="font-semibold text-ink-900">Why can’t I sell a new product?</dt>
            <dd className="mt-1 text-sm text-ink-600">New products start at zero unless you enter opening stock while adding them. New stock afterward is recorded as a purchase.</dd>
          </div>
          <div className="py-3">
            <dt className="font-semibold text-ink-900">How can I add stock?</dt>
            <dd className="mt-1 text-sm text-ink-600">Enter opening stock when adding a product. Record new arrivals through Purchases (a supplier is optional); use write-offs or stock counts only for corrections.</dd>
          </div>
          <div className="py-3">
            <dt className="font-semibold text-ink-900">What is the difference between a stock count and a write-off?</dt>
            <dd className="mt-1 text-sm text-ink-600">A stock count sets the system quantity to the total you physically counted. A write-off records a specific quantity that is no longer available and requires a reason; Lost or stolen and Other also need a note.</dd>
          </div>
          <div className="py-3">
            <dt className="font-semibold text-ink-900">Does a purchase need a supplier?</dt>
            <dd className="mt-1 text-sm text-ink-600">No. You can record a direct purchase without one.</dd>
          </div>
          <div className="py-3">
            <dt className="font-semibold text-ink-900">How do low-stock alerts work?</dt>
            <dd className="mt-1 text-sm text-ink-600">Set a positive reorder level on a product to get a threshold for stock alerts.</dd>
          </div>
          <div className="py-3">
            <dt className="font-semibold text-ink-900">Who can manage products and stock?</dt>
            <dd className="mt-1 text-sm text-ink-600">
              Owners and admins can manage products, purchases, write-offs, stock counts, and sales. Storekeepers can manage products, purchases, opening stock, and sales; cashiers can record sales.
            </dd>
          </div>
        </dl>
      </section>

      {resolution.context.role !== 'cashier' && (
        <ShowSetupChecklistButton businessId={businessId} />
      )}
    </div>
  );
}
