# Stocki360 Codebase Code Map

This document explains what key files and modules do without changing source code.

## Root Config

- `package.json`: Defines app scripts (`dev`, `build`, `start`, `lint`) and dependencies (Next.js, React, Supabase, Recharts).
- `package-lock.json`: Exact dependency lockfile for reproducible installs.
- `tsconfig.json`: TypeScript compiler settings with strict mode and `@/*` path alias.
- `next.config.ts`: Next.js config entry (currently default/placeholder).
- `eslint.config.mjs`: ESLint setup using Next core-web-vitals + TypeScript presets.
- `postcss.config.mjs`: Enables Tailwind CSS v4 PostCSS plugin.
- `next-env.d.ts`: Next.js-generated type declarations.
- `README.md`: Starter project readme.
- `AGENTS.md` and `CLAUDE.md`: Workspace instruction metadata.

## Global App Shell

- `app/layout.tsx`: Root layout, global font variables, and page shell.
- `app/globals.css`: Global Tailwind import and design tokens (surface, ink, accent, warn, good colors).
- `app/favicon.ico`: App favicon.

## Landing and Authentication

- `app/page.tsx`: Public marketing landing page for Stocki360 with CTA links to login.
- `app/login/page.tsx`: Sign-in/sign-up UI and Supabase auth interaction.

## Dashboard Area

- `app/dashboard/layout.tsx`: Shared dashboard layout and container.
- `app/dashboard/DashboardNav.tsx`: Dashboard top navigation.
- `app/dashboard/page.tsx`: Overview metrics and stock summary chart data loading.
- `app/dashboard/OverviewChart.tsx`: Recharts bar chart for stock levels.
- `app/dashboard/select-business/page.tsx`: Multi-membership business selection screen.

## Products Module

- `app/dashboard/products/page.tsx`: Server-side product data loader for active business.
- `app/dashboard/products/ProductsTable.tsx`: Product list/table with responsive layouts.
- `app/dashboard/products/ProductModal.tsx`: Add/edit/archive product dialog; calls secure product APIs.
- `app/dashboard/products/StockMovementModal.tsx`: Record stock movement dialog; insert-only operation via API.

## API Routes

- `app/api/active-business/route.ts`: Validates membership and sets `active_business_id` cookie; sanitizes redirect path.
- `app/api/businesses/route.ts`: Creates a business through RPC and sets active business cookie.
- `app/api/products/route.ts`: Creates product for validated active business and role.
- `app/api/products/[id]/route.ts`: Updates or archives product with business/role checks.
- `app/api/stock-movements/route.ts`: Inserts stock movement only when product belongs to active business.

## Supabase Client and Tenancy Helpers

- `lib/supabase/client.ts`: Browser Supabase client factory.
- `lib/supabase/server.ts`: Server Supabase client factory with cookie integration.
- `lib/supabase/types.ts`: Shared TypeScript interfaces for product and stock-level shapes.
- `lib/supabase/business-context.ts`: Resolves active business context and role from memberships + cookie.

## Database Migrations

- `supabase/migrations/20260818_phase1_tenancy_foundation.sql`:
  - Creates `business_memberships`.
  - Adds `products.is_active`.
  - Enables and defines foundational RLS policies/functions.
  - Renamed from `20260819_phase1_tenancy_foundation.sql` (SQL content unchanged) because it originally
    shared the `20260819` version with `phase1_security_fixes.sql`, which broke `schema_migrations`
    on fresh applies (e.g. Supabase Preview) and does not reflect that this migration must run first
    since `phase1_security_fixes.sql`'s functions depend on `business_memberships`. Production already
    recorded `20260819` as `phase1_security_fixes` and already has this migration's objects applied, so
    production history must be reconciled to mark `20260818_phase1_tenancy_foundation` as applied
    without re-executing its SQL.

- `supabase/migrations/20260819_phase1_security_fixes.sql`:
  - Recreates `product_stock_levels` view with `security_invoker = true`.
  - Enforces stock movement append-only behavior for authenticated users.
  - Adds `create_business_with_owner(text)` transactional bootstrap function.

## Static Assets

- `public/*.svg`: Static UI assets used by pages/components.
