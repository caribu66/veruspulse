export interface DailyPoint { date: string; amount: number }
export interface WeeklyPoint { date: string; amount: number }
export interface MonthlyPoint { month: string; amount: number }

// Compute Monday-based week start (UTC) for a given date string
function weekStartISO(dateStr: string) {
  const dt = new Date(dateStr);
  const dayOfWeek = dt.getUTCDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = ((dayOfWeek + 6) % 7);
  const weekStart = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() - diffToMonday));
  return weekStart.toISOString().slice(0, 10);
}

export function computeWeeklyFromDaily(daily: DailyPoint[]): WeeklyPoint[] {
  const map = new Map<string, number>();
  (daily || []).forEach(d => {
    const wk = weekStartISO(d.date);
    map.set(wk, (map.get(wk) || 0) + (d.amount || 0));
  });
  return Array.from(map.entries()).map(([date, amount]) => ({ date, amount })).sort((a,b)=>a.date.localeCompare(b.date));
}

export function computeMonthlyFromDaily(daily: DailyPoint[]): MonthlyPoint[] {
  const map = new Map<string, number>();
  (daily || []).forEach(d => {
    const dt = new Date(d.date);
    const month = dt.toISOString().slice(0,7); // YYYY-MM
    map.set(month, (map.get(month) || 0) + (d.amount || 0));
  });
  return Array.from(map.entries()).map(([month, amount]) => ({ month, amount })).sort((a,b)=>a.month.localeCompare(b.month));
}
