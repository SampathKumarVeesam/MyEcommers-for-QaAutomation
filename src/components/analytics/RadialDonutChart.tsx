import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ExecutiveTooltip } from './ExecutiveTooltip.js';

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

interface RadialDonutChartProps {
  data: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
}

export const RadialDonutChart: React.FC<RadialDonutChartProps> = ({
  data,
  centerLabel = 'Total',
  centerValue,
  height = 240,
}) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const displayValue = centerValue !== undefined ? centerValue : total;

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      <div style={{ width: '100%', height }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ExecutiveTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={4}
              cornerRadius={8}
              dataKey="value"
              animationDuration={800}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center KPI Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums tracking-tight">
            {displayValue}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {centerLabel}
          </span>
        </div>
      </div>

      {/* Modern Legend Pills with Tabular Figures */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
        {data.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div
              key={`legend-${idx}`}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-300 font-medium">{item.name}</span>
              <span className="text-white font-mono font-bold tabular-nums">
                {item.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
