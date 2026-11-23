import React, { useState } from 'react';

export interface HeatmapDay {
  date: string;
  count: number;
  intensity: number; // 0 to 4
}

interface ActivityHeatmapProps {
  days?: HeatmapDay[];
  colorScheme?: 'emerald' | 'sapphire';
  title?: string;
  totalActiveDays?: number;
  streak?: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  days = [],
  colorScheme = 'emerald',
  title = '365-Day Activity Ledger',
  totalActiveDays = 0,
  streak = 0,
}) => {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  const safeDays = Array.isArray(days) ? days : [];
  // Split the ~365 days into 52 or 53 weeks of 7 days each
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  safeDays.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === safeDays.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Color mapping based on intensity (0 - 4)
  const getCellColor = (intensity: number) => {
    if (colorScheme === 'emerald') {
      switch (intensity) {
        case 4:
          return 'fill-emerald-400 bg-emerald-400 shadow-emerald-500/50';
        case 3:
          return 'fill-emerald-500/80 bg-emerald-500/80';
        case 2:
          return 'fill-emerald-600/50 bg-emerald-600/50';
        case 1:
          return 'fill-emerald-700/25 bg-emerald-700/25';
        default:
          return 'fill-slate-800/40 bg-slate-800/40 dark:fill-white/[0.04] dark:bg-white/[0.04]';
      }
    } else {
      switch (intensity) {
        case 4:
          return 'fill-blue-400 bg-blue-400 shadow-blue-500/50';
        case 3:
          return 'fill-blue-500/80 bg-blue-500/80';
        case 2:
          return 'fill-indigo-600/50 bg-indigo-600/50';
        case 1:
          return 'fill-indigo-800/30 bg-indigo-800/30';
        default:
          return 'fill-slate-800/40 bg-slate-800/40 dark:fill-white/[0.04] dark:bg-white/[0.04]';
      }
    }
  };

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
      {/* Header with Title and Streak Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400">Daily transaction and delivery volume heatmap</p>
        </div>

        <div className="flex items-center gap-2">
          {totalActiveDays > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 text-slate-300 tabular-nums">
              <strong className="text-white font-mono">{totalActiveDays}</strong> Active Days
            </span>
          )}
          {streak > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-300 tabular-nums">
              🔥 <strong className="font-mono">{streak}</strong> Day Streak
            </span>
          )}
        </div>
      </div>

      {/* Heatmap Grid (Scrollable on mobile) */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
        <div className="min-w-[700px] flex gap-[3px]">
          {weeks.map((week, wIdx) => (
            <div key={`week-${wIdx}`} className="flex flex-col gap-[3px]">
              {week.map((day, dIdx) => (
                <div
                  key={`day-${wIdx}-${dIdx}`}
                  onMouseEnter={() => setHoveredDay(day)}
                  className={`w-3 h-3 rounded-[3px] border border-white/5 transition-transform hover:scale-125 cursor-pointer ${getCellColor(
                    day?.intensity ?? 0
                  )}`}
                  title={`${day?.date || 'Day'}: ${day?.count || 0} events`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Hover Info */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
        <div className="min-h-[18px]">
          {hoveredDay ? (
            <span className="text-slate-300 font-mono">
              <strong>{hoveredDay.count}</strong> events on {hoveredDay.date}
            </span>
          ) : (
            <span>Hover over a cell to view daily records</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((intensity) => (
            <div
              key={`legend-scale-${intensity}`}
              className={`w-2.5 h-2.5 rounded-[2px] ${getCellColor(intensity)}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
