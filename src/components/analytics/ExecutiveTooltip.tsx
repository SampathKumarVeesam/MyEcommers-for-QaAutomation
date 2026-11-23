import React from 'react';

interface TooltipItem {
  name: string;
  value: number | string;
  color?: string;
  unit?: string;
}

interface ExecutiveTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  titlePrefix?: string;
  currency?: boolean;
  delta?: string;
  isPositiveDelta?: boolean;
}

export const ExecutiveTooltip: React.FC<ExecutiveTooltipProps> = ({
  active,
  payload,
  label,
  titlePrefix = '',
  currency = false,
  delta,
  isPositiveDelta = true,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const formatValue = (val: any) => {
    if (typeof val === 'number') {
      if (currency) {
        return `₹${val.toLocaleString('en-IN')}`;
      }
      return val.toLocaleString('en-IN');
    }
    return val;
  };

  return (
    <div className="rounded-2xl p-3.5 bg-slate-900/95 dark:bg-[#060B19]/95 backdrop-blur-2xl border border-white/20 shadow-2xl text-xs space-y-2 min-w-[180px] z-50">
      {/* Date / Label Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
        <span className="font-semibold text-slate-300">
          {titlePrefix ? `${titlePrefix} ` : ''}{label}
        </span>
        {delta && (
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
              isPositiveDelta
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
            }`}
          >
            {delta}
          </span>
        )}
      </div>

      {/* Series Items */}
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={`item-${idx}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: entry.color || entry.stroke || '#3B82F6' }}
              />
              <span className="text-slate-400 capitalize">{entry.name}</span>
            </div>
            <span className="font-mono font-bold text-white tabular-nums">
              {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
