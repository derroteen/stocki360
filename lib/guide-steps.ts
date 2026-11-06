export interface GuideStep {
  id: string;
  title: string;
  whyItMatters: string;
  actionLabel: string;
  href: string;
  optional: boolean;
}

export const GUIDE_STEPS = [
  {
    id: 'business',
    title: 'Create your business',
    whyItMatters: 'Your business keeps its products, stock, sales, and team together.',
    actionLabel: 'Open dashboard',
    href: '/dashboard',
    optional: false,
  },
  {
    id: 'categories',
    title: 'Organize categories',
    whyItMatters: 'Categories make it easier to find and review related products.',
    actionLabel: 'Manage categories',
    href: '/dashboard/categories',
    optional: true,
  },
  {
    id: 'suppliers',
    title: 'Add suppliers',
    whyItMatters: 'Supplier details help you keep track of where you source products.',
    actionLabel: 'Manage suppliers',
    href: '/dashboard/suppliers',
    optional: true,
  },
  {
    id: 'products',
    title: 'Add products',
    whyItMatters: 'Products are the items you receive into stock and sell to customers.',
    actionLabel: 'Manage products',
    href: '/dashboard/products',
    optional: false,
  },
  {
    id: 'add-stock',
    title: 'Add stock',
    whyItMatters: 'Set opening stock when adding a product, record new stock through purchases, and use write-offs or stock counts only to correct the record.',
    actionLabel: 'Receive stock',
    href: '/dashboard/purchases',
    optional: false,
  },
  {
    id: 'first-sale',
    title: 'Record your first sale',
    whyItMatters: 'Sales update stock levels and give you a record of what was sold.',
    actionLabel: 'Record a sale',
    href: '/dashboard/sales',
    optional: false,
  },
  {
    id: 'low-stock-alerts',
    title: 'Set low-stock alerts',
    whyItMatters: 'Reorder levels help you spot products that may need replenishing.',
    actionLabel: 'Review products',
    href: '/dashboard/products',
    optional: false,
  },
  {
    id: 'invite-team',
    title: 'Invite your team',
    whyItMatters: 'Team members can work in the business with permissions for their role.',
    actionLabel: 'Manage team',
    href: '/dashboard/team',
    optional: false,
  },
] as const satisfies readonly GuideStep[];

export type GuideStepId = (typeof GUIDE_STEPS)[number]['id'];
