export type StockReportPreset = 'this_month' | 'last_month' | 'last_30_days' | 'custom';

export interface StockReportDates {
  fromDate: string;
  toDate: string;
}

function datePartsInNairobi(date: Date): StockReportDates {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const today = `${values.year}-${values.month}-${values.day}`;
  return { fromDate: today, toDate: today };
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

export function getStockReportDates(preset: Exclude<StockReportPreset, 'custom'>, now = new Date()): StockReportDates {
  const today = datePartsInNairobi(now).fromDate;
  const [year, month] = today.split('-').map(Number);

  if (preset === 'this_month') {
    return { fromDate: `${today.slice(0, 7)}-01`, toDate: today };
  }
  if (preset === 'last_month') {
    const lastMonth = new Date(Date.UTC(year, month - 2, 1));
    const firstDay = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}-01`;
    return { fromDate: firstDay, toDate: shiftDate(`${today.slice(0, 7)}-01`, -1) };
  }
  return { fromDate: shiftDate(today, -29), toDate: today };
}

function dateAtNairobiMidnight(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 3 * 60 * 60 * 1000).toISOString();
}

export function getStockReportTimestamps({ fromDate, toDate }: StockReportDates) {
  return {
    from: dateAtNairobiMidnight(fromDate),
    to: dateAtNairobiMidnight(shiftDate(toDate, 1)),
  };
}
