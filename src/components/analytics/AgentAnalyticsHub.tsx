import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  DollarSign,
  Power,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Truck,
  Wallet,
  Zap,
} from 'lucide-react';
import { apiUrl } from '../../config/api.js';
import { ExecutiveTooltip } from './ExecutiveTooltip.js';
import { ActivityHeatmap } from './ActivityHeatmap.js';
import { RadialDonutChart } from './RadialDonutChart.js';
import { MilestoneBadgesShelf } from './MilestoneBadgesShelf.js';

interface AgentAnalyticsHubProps {
  token: string;
  isOnline: boolean;
  onToggleDuty: () => void;
  activeStoreName?: string;
}

export const AgentAnalyticsHub: React.FC<AgentAnalyticsHubProps> = ({
  token,
  isOnline,
  onToggleDuty,
  activeStoreName = 'Hitech City / Madhapur Hub',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [earningsView, setEarningsView] = useState<'30D' | '12M'>('30D');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/agent/my-analytics'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to retrieve agent analytics');
      }

      setData(json.data);
    } catch (err: any) {
      console.error('[Agent Analytics Hub Error]:', err);
      setError(err.message || 'Error fetching analytics record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">
          Loading personal delivery metrics &amp; earnings...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/25 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h4 className="text-base font-bold text-white">Metrics Unavailable</h4>
        <p className="text-xs text-rose-300">{error || 'Could not load analytics'}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { profile, codLiability, earnings12M, earnings30D, deliveryScore, fifoGauge, milestones, heatmap } = data;

  const currentEarningsData =
    earningsView === '30D'
      ? earnings30D.map((item: any) => ({ label: item.date, earnings: item.earnings }))
      : earnings12M.map((item: any) => ({ label: item.month, earnings: item.earnings }));

  return (
    <div className="space-y-6">
      {/* STICKY GLASS HEADER WITH DUTY TOGGLE */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 border border-white/20 text-white font-black text-lg flex items-center justify-center shadow-lg">
            {profile.name?.slice(0, 2).toUpperCase() || 'AG'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {profile.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {profile.id}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Assigned Store: <strong className="text-slate-200">{activeStoreName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Duty Toggle Button */}
          <button
            type="button"
            onClick={onToggleDuty}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer border ${
              isOnline
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>Duty: {isOnline ? 'Online (Accepting)' : 'Offline (Paused)'}</span>
          </button>
        </div>
      </div>

      {/* 1. COD CASH-TO-DEPOSIT HERO CARD */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-900/80 to-[#0A1024] backdrop-blur-xl border border-amber-500/30 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Store Cash Reconciliation
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums tracking-tight">
              Pending Cash to Deposit: &#8377;{codLiability.pendingCashToDeposit?.toLocaleString('en-IN') || 0}
            </h3>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Settlement Status
            </span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold font-mono mt-1 ${
                codLiability.pendingCashToDeposit === 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {codLiability.pendingCashToDeposit === 0 ? 'CLEAN LEDGER' : 'DEPOSIT REQUIRED'}
            </span>
          </div>
        </div>

        {/* Luminous Gradient Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Settled at Store: &#8377;{codLiability.settledCashAtStore?.toLocaleString('en-IN') || 0}</span>
            <span>Total Collected: &#8377;{codLiability.totalCollectedCash?.toLocaleString('en-IN') || 0}</span>
          </div>
          <div className="h-3 rounded-full bg-white/5 border border-white/10 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-700 shadow-md"
              style={{ width: `${Math.min(100, Math.max(8, codLiability.settlementPercentage || 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. PERFORMANCE & EARNINGS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Area Chart */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Delivery Commission Earnings
              </h3>
              <p className="text-xs text-slate-400">
                15% verified payout on successfully completed customer deliveries
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setEarningsView('30D')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  earningsView === '30D'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setEarningsView('12M')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  earningsView === '12M'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                12 Months
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentEarningsData}>
                <defs>
                  <linearGradient id="agentEarningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip content={<ExecutiveTooltip currency={true} titlePrefix="Time:" />} />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#agentEarningsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Store Rank Percentile Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Hub Standing
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums mt-1">
              {profile.storeRankPercentile}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Calculated dynamically against active delivery partners stationed at {profile.deliveryZone}
            </p>
          </div>

          {/* 3-Minute FIFO Acceptance Rate Circular Gauge */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">3-Min FIFO Acceptance</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                {fifoGauge.acceptanceRate}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${fifoGauge.acceptanceRate}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Target: Dispatch accepted within 180 seconds of assignment
            </p>
          </div>
        </div>
      </div>

      {/* 3. DELIVERY SCORE RADIAL DONUT + MILESTONES SHELF */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Delivery SLA Performance Ratio
          </h3>
          <RadialDonutChart data={deliveryScore} centerLabel="Completed" />
        </div>

        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl">
          <MilestoneBadgesShelf badges={milestones || []} />
        </div>
      </div>

      {/* 4. 365-DAY DELIVERY ACTIVITY HEATMAP */}
      <ActivityHeatmap
        days={heatmap.days || []}
        colorScheme="emerald"
        title="365-Day Delivery Activity Calendar"
        totalActiveDays={heatmap.totalActiveDays}
        streak={heatmap.currentStreak}
      />
    </div>
  );
};
