export const WALKTHROUGH_SCENES = [
  {
    title: 'Add your products',
    caption: 'Start with a clear, organized product catalog.',
  },
  {
    title: 'Record purchases and sales',
    caption: 'Every purchase and sale updates your stock instantly.',
  },
  {
    title: 'Monitor your stock',
    caption: 'Spot low stock early with a live view of your inventory.',
  },
  {
    title: 'Reorder before you run out',
    caption: 'Reorder in time and keep your business moving.',
  },
] as const;

export const WALKTHROUGH_PRODUCT = {
  name: 'Galvanized Nails 2.5 inch',
  sku: 'NAIL-025',
  barcode: '616110024050',
  price: 'KES 850',
  quantity: 50,
};

export const WALKTHROUGH_STOCK = {
  opening: 0,
  purchase: 50,
  sale: 42,
  reorder: 54,
};

export const WALKTHROUGH_DASHBOARD_BARS = [
  { label: 'Mon', height: 34 },
  { label: 'Tue', height: 53 },
  { label: 'Wed', height: 43 },
  { label: 'Thu', height: 72 },
  { label: 'Fri', height: 57, lowStock: true },
  { label: 'Sat', height: 87 },
] as const;

export const WALKTHROUGH_SCENE_DURATION_MS = 7000;
export const WALKTHROUGH_DURATION_MS =
  WALKTHROUGH_SCENE_DURATION_MS * WALKTHROUGH_SCENES.length;
