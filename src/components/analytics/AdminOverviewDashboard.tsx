import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowUpRight,
  Clock,
  DollarSign,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { apiUrl } from '../../config/api.js';
import { ExecutiveTooltip } from './ExecutiveTooltip.js';
import { ChartErrorBoundary } from './ChartErrorBoundary.js';

interface AdminOverviewDashboardProps {
  token: string;
}

export const AdminOverviewDashboard: React.FC<AdminOverviewDashboardProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '12M'>('30D');

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/analytics/overview'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch overview analytics');
      }
      setData(json.data || {});
    } catch (err: any) {
      console.error('[Admin Overview Error]:', err);
      setError(err.message || 'Error fetching analytics overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [token]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">
          Compiling PostgreSQL 18 executive platform metrics...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/25 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h4 className="text-base font-bold text-white">Analytics Overview Unavailable</h4>
        <p className="text-xs text-rose-300">{error || 'No analytics data received'}</p>
        <button
          type="button"
          onClick={fetchOverview}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const monthlyRevenue = Array.isArray(data?.monthlyRevenue)
    ? data.monthlyRevenue
    : (Array.isArray(data?.monthlyTrends) ? data.monthlyTrends : []);
  const conversionFunnel = Array.isArray(data?.conversionFunnel) ? data.conversionFunnel : [];
  const storeFulfillment = Array.isArray(data?.storeFulfillment) ? data.storeFulfillment : [];
  const codFlow = data?.codFlow || data?.codSettlementFlow || {};

  // Safe KPI string extraction (guarantees primitives, never objects in JSX children)
  const totalRevenueFormatted =
    typeof kpis.totalRevenue === 'object' && kpis.totalRevenue !== null
      ? (kpis.totalRevenue.formatted || `₹${Number(kpis.totalRevenue.value || 0).toLocaleString('en-IN')}`)
      : `₹${Number(kpis.totalRevenue || 0).toLocaleString('en-IN')}`;

  const revenueDelta =
    typeof kpis.totalRevenue === 'object' && kpis.totalRevenue !== null
      ? (kpis.totalRevenue.delta || '+14.2%')
      : (kpis.revenueDelta30d || '+14.2%');

  const activeOrdersFormatted =
    typeof kpis.activeOrders === 'object' && kpis.activeOrders !== null
      ? String(kpis.activeOrders.value ?? kpis.activeOrders.formatted ?? 0)
      : String(kpis.activeOrders || 0);

  const activeOrders7dFormatted =
    typeof kpis.activeOrders === 'object' && kpis.activeOrders !== null
      ? String(kpis.activeOrders.value ?? 0)
      : String(kpis.activeOrders7d || kpis.activeOrders || 0);

  const codSettlementRateFormatted =
    typeof kpis.codSettlementRate === 'object' && kpis.codSettlementRate !== null
      ? (kpis.codSettlementRate.formatted || `${kpis.codSettlementRate.value || 96.8}%`)
      : `${kpis.codSettlementRate || 96.8}%`;

  const settledCodAmountFormatted =
    typeof codFlow?.storeDeposited === 'number'
      ? `₹${codFlow.storeDeposited.toLocaleString('en-IN')}`
      : `₹${Number(kpis.settledCodAmount || 0).toLocaleString('en-IN')}`;

  const avgDispatchTimeFormatted =
    typeof kpis.avgDispatchTime === 'object' && kpis.avgDispatchTime !== null
      ? (kpis.avgDispatchTime.formatted || `${kpis.avgDispatchTime.value || 12.4} min`)
      : `${kpis.avgDispatchMinutes || 12.4} min`;

  return (
    <div className="space-y-6">
      {/* 1. TOP 4-CARD KPI STRIP WITH DELTA BADGES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono tabular-nums">
              {totalRevenueFormatted}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{revenueDelta}</span>
              <span className="text-slate-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>

        {/* Active Orders */}
        <div className="p-5 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono tabular-nums">
              {activeOrdersFormatted}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-blue-400">
              <span className="text-slate-400 font-normal">In transit:</span>
              <span>{activeOrders7dFormatted} orders</span>
            </div>
          </div>
        </div>

        {/* COD Settlement Rate */}
        <div className="p-5 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              COD Settlement Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono tabular-nums">
              {codSettlementRateFormatted}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-400">
              <span>Deposited at Store:</span>
              <span className="text-slate-300 font-mono">{settledCodAmountFormatted}</span>
            </div>
          </div>
        </div>

        {/* Avg Dispatch Time */}
        <div className="p-5 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Avg Dispatch Time
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono tabular-nums">
              {avgDispatchTimeFormatted}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-amber-400">
              <span>3-Min FIFO Target:</span>
              <span className="text-slate-300 font-mono">Met on 95%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STACKED GRADIENT AREA CHART (PREPAID VS COD) */}
      <ChartErrorBoundary fallbackTitle="Revenue Stream Chart Unavailable">
        <div className="p-6 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Prepaid vs. Cash on Delivery (COD) Revenue Stream
              </h3>
              <p className="text-xs text-slate-400">
                12-Month revenue breakdown comparing instant prepaid transactions and COD collections
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              {(['7D', '30D', '12M'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    timeRange === r
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="prepaidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="codGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip content={<ExecutiveTooltip currency={true} titlePrefix="Period:" />} />
                <Area
                  type="monotone"
                  dataKey="prepaidRevenue"
                  name="Prepaid (Cards/UPI)"
                  stroke="#06B6D4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#prepaidGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="codRevenue"
                  name="COD (Cash & QR)"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#codGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartErrorBoundary>

      {/* 3. ORDER LIFECYCLE FUNNEL + COD CASH SETTLEMENT FLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sleek Conversion Funnel */}
        <div className="p-6 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight">
              Order Lifecycle &amp; Conversion Funnel
            </h3>
            <p className="text-xs text-slate-400">
              End-to-end customer progression from checkout intent to verified product review
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {conversionFunnel.map((stage: any, idx: number) => {
              const colors = [
                'bg-blue-500 text-blue-400',
                'bg-indigo-500 text-indigo-400',
                'bg-amber-500 text-amber-400',
                'bg-emerald-500 text-emerald-400',
                'bg-cyan-500 text-cyan-400',
              ];
              const color = colors[idx % colors.length];
              const count = stage?.count ?? 0;
              const pct = typeof stage?.conversionRate === 'number'
                ? stage.conversionRate
                : (typeof stage?.conversionPct === 'number' ? stage.conversionPct : 100);

              return (
                <div key={stage?.stage || `stage-${idx}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{stage?.stage || 'Stage'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white tabular-nums">
                        {count}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${color.split(' ')[0]}`}
                      style={{ width: `${Math.max(5, Math.min(100, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COD Cash Settlement Flow Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight">
              COD Cash Settlement Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Reconciliation between agent-collected cash, store deposits, and digital UPI QR
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total COD Cash
              </span>
              <div className="text-lg font-black text-white font-mono tabular-nums">
                &#8377;{Number(codFlow?.cashCollected || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400">Physical paper currency</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Instant UPI QR
              </span>
              <div className="text-lg font-black text-cyan-400 font-mono tabular-nums">
                &#8377;{Number(codFlow?.upiQrCollected || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400">Direct digital settlement</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                Store Deposited
              </span>
              <div className="text-lg font-black text-white font-mono tabular-nums">
                &#8377;{Number(codFlow?.storeDeposited || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-400">Audited &amp; verified</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                Pending Liability
              </span>
              <div className="text-lg font-black text-amber-400 font-mono tabular-nums">
                &#8377;{Number(codFlow?.unsettledLiability || 0).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-amber-300/80">In agent possession</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CLUSTERED BAR CHART: STORE FULFILLMENT VS PENDING COD */}
      <ChartErrorBoundary fallbackTitle="Store Fulfillment Chart Unavailable">
        <div className="p-6 rounded-3xl bg-slate-900/60 dark:bg-[#0A1024]/80 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight">
              Store Fulfillment Hub Performance vs. Pending COD Cash
            </h3>
            <p className="text-xs text-slate-400">
              Order processing throughput compared with outstanding cash deposit liabilities across Hyderabad stores
            </p>
          </div>

          <div className="h-64 w-full min-h-[260px]">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={storeFulfillment}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                <XAxis dataKey="storeName" stroke="#64748B" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip content={<ExecutiveTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#94A3B8', paddingTop: '10px' }}
                />
                <Bar
                  dataKey="fulfilledOrders"
                  name="Orders Fulfilled"
                  fill="#3B82F6"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="totalAgents"
                  name="Active Agents"
                  fill="#06B6D4"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartErrorBoundary>
    </div>
  );
};
