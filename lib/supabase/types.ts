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
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  created_at: string;
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

export interface CreatePurchaseItemPayload {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchasePayload {
  supplierId?: string | null;
  referenceNumber?: string | null;
  purchaseDate?: string;
  notes?: string | null;
  items: CreatePurchaseItemPayload[];
  idempotencyKey?: string;
}
