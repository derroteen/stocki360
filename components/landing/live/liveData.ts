export type LiveEventKind = "sale" | "purchase" | "low" | "reorder" | "restocked";

export interface LiveEvent {
  id: string;
  kind: LiveEventKind;
  message: string;
  animate?: boolean;
}

export interface LiveStockItem {
  name: string;
  quantity: number;
  threshold: number;
  maximum: number;
  price: number;
  reorderIn: number | null;
  restockedFor: number;
}

export interface LiveSimulationState {
  tick: number;
  sales: number;
  orders: number;
  stock: LiveStockItem[];
  chart: number[];
  events: LiveEvent[];
  ticker: string[];
  scannerActive: boolean;
}

export const LIVE_PRODUCTS: LiveStockItem[] = [
  { name: "Galvanized Nails 2.5 inch", quantity: 28, threshold: 8, maximum: 40, price: 450, reorderIn: null, restockedFor: 0 },
  { name: "PVC Pipe 20mm", quantity: 16, threshold: 6, maximum: 24, price: 450, reorderIn: null, restockedFor: 0 },
  { name: "Paint Roller Set", quantity: 12, threshold: 4, maximum: 20, price: 780, reorderIn: null, restockedFor: 0 },
  { name: "Cement 50kg", quantity: 21, threshold: 7, maximum: 30, price: 850, reorderIn: null, restockedFor: 0 },
  { name: "Iron Sheet 3m", quantity: 10, threshold: 4, maximum: 18, price: 1650, reorderIn: null, restockedFor: 0 },
  { name: "Wire Mesh", quantity: 18, threshold: 5, maximum: 26, price: 1250, reorderIn: null, restockedFor: 0 },
];

export const COMMAND_QUERIES = [
  "sales today",
  "low stock this week",
  "PVC pipe",
  "reorder cement",
] as const;

export const INITIAL_LIVE_STATE: LiveSimulationState = {
  tick: 0,
  sales: 87420,
  orders: 32,
  stock: LIVE_PRODUCTS.map((product) => ({ ...product })),
  chart: Array.from({ length: 60 }, (_, index) => {
    const wave = Math.sin(index * 0.34) * 13 + Math.cos(index * 0.13) * 9;
    return Math.max(12, Math.round(54 + wave + (index / 59) * 18));
  }),
  events: [
    { id: "seed-1", kind: "sale", message: "Sale #1043 · 3 x PVC Pipe 20mm · KES 1,350 · M-Pesa confirmed" },
    { id: "seed-2", kind: "purchase", message: "Purchase received · Cement 50kg · 20 bags checked in" },
    { id: "seed-3", kind: "restocked", message: "Restocked · Galvanized Nails 2.5 inch · 40 units ready" },
    { id: "seed-4", kind: "sale", message: "Sale #1042 · Paint Roller Set · KES 780 · M-Pesa confirmed" },
  ],
  ticker: [
    "M-Pesa · KES 1,350 received",
    "Cement 50kg · Purchase checked in",
    "Galvanized Nails · Reorder complete",
    "PVC Pipe 20mm · Sale confirmed",
    "Paint Roller Set · Stock updated",
    "Iron Sheet 3m · Ready for sale",
    "Wire Mesh · Inventory verified",
    "Daily sales · KES 87,420",
  ],
  scannerActive: false,
};
