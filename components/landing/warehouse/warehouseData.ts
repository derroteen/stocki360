export const WAREHOUSE_PHASES = [
  { title: "Add your products", caption: "Every product has a place on your shelves." },
  { title: "Record purchases and sales", caption: "Incoming and outgoing stock stays in sync." },
  { title: "Monitor your stock", caption: "A clear signal appears before stock runs low." },
  { title: "Reorder before you run out", caption: "Restock in time and keep business moving." },
] as const;

export const WAREHOUSE_PHASE_DURATION_MS = 7000;
export const WAREHOUSE_LOOP_DURATION_MS =
  WAREHOUSE_PHASE_DURATION_MS * WAREHOUSE_PHASES.length;

export const WAREHOUSE_COLORS = {
  light: {
    floor: "#E8EEF7",
    floorLine: "#BFDBFE",
    rack: "#64748B",
    rackDark: "#475569",
    cardboard: "#C58B50",
    cardboardLight: "#D7A66A",
    cardboardDark: "#9A6535",
    amber: "#F59E0B",
    green: "#16A34A",
    ink: "#1E293B",
    accent: "#2563EB",
    loading: "#CBD5E1",
  },
  dark: {
    floor: "#17243A",
    floorLine: "#1D4ED8",
    rack: "#64748B",
    rackDark: "#334155",
    cardboard: "#B77B42",
    cardboardLight: "#D09A5E",
    cardboardDark: "#80532F",
    amber: "#FBBF24",
    green: "#4ADE80",
    ink: "#E2E8F0",
    accent: "#60A5FA",
    loading: "#334155",
  },
} as const;

export const WAREHOUSE_BOX_SLOTS = Array.from({ length: 54 }, (_, index) => {
  const rack = Math.floor(index / 18);
  const level = Math.floor((index % 18) / 6);
  const column = index % 6;

  return {
    rack,
    level,
    column,
    x: -1.55 + column * 0.62,
    y: 0.53 + level * 0.68,
    z: -1.65 + rack * 1.65,
  };
});

export const WAREHOUSE_STOCK_COUNTS = [30, 50, 7, 42] as const;
