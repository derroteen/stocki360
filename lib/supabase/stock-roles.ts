import type { BusinessRole } from './business-context';

// The database remains the authority for stock-operation permissions.
export const MANUAL_ADJUSTMENT_ROLES: BusinessRole[] = ['owner', 'admin'];
export const OPENING_STOCK_ROLES: BusinessRole[] = ['owner', 'admin', 'storekeeper'];
