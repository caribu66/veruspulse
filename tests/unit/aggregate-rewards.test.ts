import { computeWeeklyFromDaily, computeMonthlyFromDaily } from '@/lib/utils/aggregate-rewards';

describe('aggregate-rewards helpers', () => {
  const daily = [
    { date: '2025-10-01', amount: 1 },
    { date: '2025-10-02', amount: 2 },
    { date: '2025-10-06', amount: 3 }, // Monday
    { date: '2025-10-07', amount: 4 },
    { date: '2025-11-01', amount: 5 }
  ];

  it('computes weekly sums grouped by Monday week start', () => {
    const weekly = computeWeeklyFromDaily(daily as any);
    // Expect weeks: week starting 2025-09-29 (contains 10-01 and 10-02), week starting 2025-10-06, week starting 2025-10-27 (contains 11-01 belongs to 2025-10-27? check)
    // Calculate explicitly: 2025-10-01 (Wed) and 2025-10-02 (Thu) -> week start 2025-09-29
    expect(weekly.find(w => w.date === '2025-09-29')?.amount).toBe(3); // 1 + 2
    expect(weekly.find(w => w.date === '2025-10-06')?.amount).toBe(7); // 3 + 4
    // 2025-11-01 (Sat) belongs to week starting 2025-10-27
    expect(weekly.find(w => w.date === '2025-10-27')?.amount).toBe(5);
  });

  it('computes monthly sums grouped by YYYY-MM', () => {
    const monthly = computeMonthlyFromDaily(daily as any);
    expect(monthly.find(m => m.month === '2025-10')?.amount).toBe(1+2+3+4);
    expect(monthly.find(m => m.month === '2025-11')?.amount).toBe(5);
  });
});
