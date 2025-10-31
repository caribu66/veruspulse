'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

interface HeatmapCalendarProps {
  data: Array<{ date: string; value: number }>; // date in YYYY-MM-DD format
  startDate?: Date;
  endDate?: Date;
  cellSize?: number;
  gap?: number;
  className?: string;
}

export function HeatmapCalendar({
  data,
  startDate,
  endDate,
  cellSize = 12,
  gap = 2,
  className = '',
}: HeatmapCalendarProps) {
  const tCommon = useTranslations('common');
  const tStaking = useTranslations('staking');
  const { grid, maxValue, monthLabels } = useMemo(() => {
    // Default to last 365 days if no dates provided
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Create a map of date -> value
    const dataMap = new Map<string, number>();
    let maxValue = 0;

    data.forEach(({ date, value }) => {
      dataMap.set(date, value);
      if (value > maxValue) maxValue = value;
    });

    // Generate grid: weeks x days
    const grid: Array<Array<{ date: Date; value: number; dateStr: string }>> =
      [];
    const current = new Date(start);

    // Start from the first Sunday before or on start date
    current.setDate(current.getDate() - current.getDay());

    let week: Array<{ date: Date; value: number; dateStr: string }> = [];
    const monthLabels: Array<{ month: string; x: number }> = [];
    let currentMonth = -1;
    let weekIndex = 0;

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const value = dataMap.get(dateStr) || 0;

      week.push({
        date: new Date(current),
        value,
        dateStr,
      });

      // Track month labels
      if (current.getMonth() !== currentMonth) {
        currentMonth = current.getMonth();
        monthLabels.push({
          month: current.toLocaleDateString('en-US', { month: 'short' }),
          x: weekIndex,
        });
      }

      // New week on Sunday
      if (current.getDay() === 6) {
        grid.push(week);
        week = [];
        weekIndex++;
      }

      current.setDate(current.getDate() + 1);
    }

    // Push remaining days
    if (week.length > 0) {
      grid.push(week);
    }

    return { grid, maxValue, monthLabels };
  }, [data, startDate, endDate]);

  const getColor = (value: number): string => {
    if (value === 0) return 'rgb(30, 41, 59)'; // slate-800
    const intensity = maxValue > 0 ? value / maxValue : 0;

    if (intensity <= 0.2) return 'rgb(34, 197, 94, 0.3)'; // green-500 20%
    if (intensity <= 0.4) return 'rgb(34, 197, 94, 0.5)'; // green-500 50%
    if (intensity <= 0.6) return 'rgb(34, 197, 94, 0.7)'; // green-500 70%
    if (intensity <= 0.8) return 'rgb(34, 197, 94, 0.9)'; // green-500 90%
    return 'rgb(34, 197, 94)'; // green-500 100%
  };

  const width = grid.length * (cellSize + gap) + 40;
  const height = 7 * (cellSize + gap) + 40;

  return (
    <div className={`${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Day labels */}
        {['Mon', 'Wed', 'Fri'].map((day, i) => (
          <text
            key={day}
            x="0"
            y={30 + (i * 2 + 1) * (cellSize + gap)}
            fontSize="10"
            fill="#9ca3af"
            textAnchor="start"
          >
            {day}
          </text>
        ))}

        {/* Month labels */}
        {monthLabels.map((label, index) => (
          <text
            key={`${label.month}-${index}`}
            x={35 + label.x * (cellSize + gap)}
            y="15"
            fontSize="10"
            fill="#9ca3af"
            textAnchor="start"
          >
            {label.month}
          </text>
        ))}

        {/* Grid */}
        <g transform="translate(35, 25)">
          {grid.map((week, weekIndex) => (
            <g
              key={weekIndex}
              transform={`translate(${weekIndex * (cellSize + gap)}, 0)`}
            >
              {week.map((day, dayIndex) => {
                const isOutOfRange =
                  day.date < (startDate || new Date(0)) ||
                  day.date > (endDate || new Date());
                return (
                  <g key={dayIndex}>
                    <rect
                      x="0"
                      y={dayIndex * (cellSize + gap)}
                      width={cellSize}
                      height={cellSize}
                      rx="2"
                      fill={
                        isOutOfRange ? 'rgb(17, 24, 39)' : getColor(day.value)
                      }
                      stroke="rgba(0,0,0,0.1)"
                      strokeWidth="1"
                      className="hover:stroke-purple-500 hover:stroke-2 transition-all cursor-pointer"
                    >
                      <title>
                        {day.date.toLocaleDateString()}: {day.value}{' '}
                        {day.value === 1 ? 'stake' : 'stakes'}
                      </title>
                    </rect>
                  </g>
                );
              })}
            </g>
          ))}
        </g>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-end space-x-2 mt-4 text-xs text-gray-400">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getColor(intensity * maxValue) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
