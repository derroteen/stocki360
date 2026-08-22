import { ProductStockLevel } from '@/lib/supabase/types';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

/**
 * Classifies product stock level based on Stocki360 business rules:
 * - IN STOCK: current_stock > reorder_level
 * - LOW STOCK: current_stock > 0 AND current_stock <= reorder_level
 * - OUT OF STOCK: current_stock <= 0
 */
export function getStockStatus(currentStock: number, reorderLevel: number): StockStatus {
  if (currentStock <= 0) {
    return 'out_of_stock';
  }
  if (currentStock <= reorderLevel) {
    return 'low_stock';
  }
  return 'in_stock';
}

/**
 * Prioritizes low-stock and out-of-stock products for dashboard display and alert processing:
 * 1. Out of stock items first (critical urgency)
 * 2. Lowest stock relative to reorder level (highest deficit ratio)
 * 3. Fallback to lowest remaining units
 *
 * This clean utility is also ready to be consumed by the future SMS alerts service.
 */
export function prioritizeLowStockProducts<T extends { current_stock: number; reorder_level: number }>(
  products: T[]
): T[] {
  return [...products].sort((a, b) => {
    const stockA = a.current_stock ?? 0;
    const stockB = b.current_stock ?? 0;
    const reorderA = a.reorder_level ?? 0;
    const reorderB = b.reorder_level ?? 0;

    const statusA = getStockStatus(stockA, reorderA);
    const statusB = getStockStatus(stockB, reorderB);

    // 1. Out of stock items always come first
    if (statusA === 'out_of_stock' && statusB !== 'out_of_stock') return -1;
    if (statusB === 'out_of_stock' && statusA !== 'out_of_stock') return 1;

    // If both are out of stock, sort by higher reorder level (higher priority item)
    if (statusA === 'out_of_stock' && statusB === 'out_of_stock') {
      return reorderB - reorderA;
    }

    // 2. Sort by relative stock level ratio (current / reorder) ascending
    const ratioA = reorderA > 0 ? stockA / reorderA : stockA;
    const ratioB = reorderB > 0 ? stockB / reorderB : stockB;

    if (ratioA !== ratioB) {
      return ratioA - ratioB;
    }

    // 3. Fallback: absolute stock units ascending
    return stockA - stockB;
  });
}
