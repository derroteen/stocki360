export interface ProductRow {
  id: string;
  business_id: string;
  sku: string;
  name: string;
  cost_price: number;
  sell_price: number;
  reorder_level: number;
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
}
