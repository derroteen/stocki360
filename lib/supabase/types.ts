export interface Category {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  /** false means archived; the record is preserved but hidden from active selectors */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  /** false means archived; the record is preserved but hidden from active selectors */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  business_id: string;
  sku: string;
  name: string;
  cost_price: number;
  sell_price: number;
  reorder_level: number;
  is_active?: boolean;
  category_id?: string | null;
  supplier_id?: string | null;
  stock_unit: string;
  package_unit?: string | null;
  units_per_package?: number | null;
  created_at: string;
}

export interface ProductStockLevel extends ProductRow {
  current_stock: number;
  is_low_stock: boolean;
}

export interface ProductDraft {
  id?: string;
  business_id?: string;
  sku: string;
  name: string;
  cost_price: number;
  sell_price: number;
  reorder_level: number;
  category_id?: string | null;
  supplier_id?: string | null;
  stock_unit?: string;
  package_unit?: string | null;
  units_per_package?: number | null;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  created_at: string;
  entry_mode?: 'individual' | 'package';
  package_quantity?: number | null;
  package_unit_snapshot?: string | null;
  units_per_package_snapshot?: number | null;
  package_unit_cost?: number | null;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

export interface Purchase {
  id: string;
  business_id: string;
  supplier_id?: string | null;
  reference_number?: string | null;
  purchase_date: string;
  notes?: string | null;
  total_amount: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: string;
    name: string;
  } | null;
  purchase_items?: PurchaseItem[];
}

export interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
}

export type CreatePurchaseItemPayload =
  | { productId: string; entryMode: 'individual'; quantity: number; unitCost: number }
  | { productId: string; entryMode: 'package'; packageQuantity: number; packageUnitCost: number };

export interface CreatePurchasePayload {
  supplierId?: string | null;
  referenceNumber?: string | null;
  purchaseDate?: string;
  notes?: string | null;
  items: CreatePurchaseItemPayload[];
  idempotencyKey: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  entry_mode: 'individual' | 'package';
  package_quantity?: number | null;
  package_unit_snapshot?: string | null;
  units_per_package_snapshot?: number | null;
  package_unit_price?: number | null;
  created_at: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

export interface Sale {
  id: string;
  business_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  reference_number?: string | null;
  sale_date: string;
  payment_method?: string | null;
  notes?: string | null;
  total_amount: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  sale_items?: SaleItem[];
}

export type CreateSaleItemPayload =
  | { productId: string; entryMode: 'individual'; quantity: number; unitPrice: number }
  | { productId: string; entryMode: 'package'; packageQuantity: number; packageUnitPrice: number };

export interface CreateSalePayload {
  customerName?: string | null;
  customerPhone?: string | null;
  referenceNumber?: string | null;
  saleDate?: string;
  paymentMethod?: string | null;
  notes?: string | null;
  items: CreateSaleItemPayload[];
  idempotencyKey: string;
}