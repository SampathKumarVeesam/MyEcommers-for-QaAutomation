import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Award,
  RefreshCw,
  Truck,
  User,
  X,
} from 'lucide-react';
import { apiUrl } from '../../config/api.js';
import { ExecutiveTooltip } from './ExecutiveTooltip.js';
import { ActivityHeatmap } from './ActivityHeatmap.js';
import { RadialDonutChart } from './RadialDonutChart.js';
import { MilestoneBadgesShelf } from './MilestoneBadgesShelf.js';
import { ChartErrorBoundary } from './ChartErrorBoundary.js';

interface UserAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userType: 'customer' | 'agent';
  token: string;
}

export const UserAnalyticsModal: React.FC<UserAnalyticsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userType,
  token,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint =
          userType === 'customer'
            ? `/api/admin/analytics/customers/${userId}`
            : `/api/admin/analytics/agents/${userId}`;

        const res = await fetch(apiUrl(endpoint), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load user analytics');
        }

        setData(json.data || {});
      } catch (err: any) {
        console.error('[User Analytics Modal Error]:', err);
        setError(err.message || 'Error fetching analytics record');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isOpen, userId, userType, token]);

  if (!isOpen) return null;

  const profile = data?.profile || {};
  const spendTrend = Array.isArray(data?.spendTrend) ? data.spendTrend : [];
  const earningsTrend = Array.isArray(data?.earningsTrend) ? data.earningsTrend : [];
  const percentileHistogram = Array.isArray(data?.percentileHistogram) ? data.percentileHistogram : [];
  const orderOutcomes = Array.isArray(data?.orderOutcomes) ? data.orderOutcomes : [];
  const slaOutcomes = Array.isArray(data?.slaOutcomes) ? data.slaOutcomes : [];
  const categoryRadar = Array.isArray(data?.categoryRadar) ? data.categoryRadar : [];
  const milestones = Array.isArray(data?.milestones) ? data.milestones : [];
  const heatmapDays = Array.isArray(data?.heatmap?.days) ? data.heatmap.days : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-[28px] bg-[#070C1B] border border-blue-500/20 shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Luminous Specular Top Highlight */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none" />

        {/* Modal Header Bar */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-slate-900/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
              {userType === 'customer' ? (
                <User className="w-5 h-5" />
              ) : (
                <Truck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Executive {userType === 'customer' ? 'Customer' : 'Delivery Agent'} Dossier
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {profile.id || userId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                PostgreSQL 18 Real-time Analytics &amp; Performance Ledger
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-close-user-analytics-modal"
            aria-label="Close"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin scrollbar-thumb-white/10">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-sm font-semibold text-slate-400">
                Querying PostgreSQL analytical projections...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Analytics Unavailable</h4>
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          ) : (
            <ChartErrorBoundary fallbackTitle="User Dossier Analytics Temporarily Unavailable">
              <>
                {/* Executive Profile Header Strip */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white/20 text-white font-black text-xl flex items-center justify-center shadow-lg overflow-hidden">
                      {profile.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile.name || 'User'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (profile.name || 'SP').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-white">
                          {profile.name || 'Account User'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Active Account
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>{profile.email || 'N/A'}</span>
                        <span>&bull;</span>
                        <span>{profile.phone || '+91 98765 43210'}</span>
                        {profile.deliveryZone && (
                          <>
                            <span>&bull;</span>
                            <span className="text-blue-400">
                              {profile.deliveryZone} ({profile.vehicleType || 'Vehicle'})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metallic / Emerald Percentile Badge */}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/30 shadow-lg">
                    <Award className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                        Platform Standing
                      </span>
                      <span className="text-sm font-black text-white font-mono">
                        {profile.topPercentile || `Top ${profile.rawPercentile || 5}%`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ROW 1: Spend/Earnings Trend + Percentile Distribution Histogram */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 12-Month Area Chart */}
                  <div className="lg:col-span-2 p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          12-Month {userType === 'customer' ? 'Expenditure' : 'Earnings'} Trajectory
                        </h4>
                        <p className="text-xs text-slate-400">
                          Monthly aggregated transaction value
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        INR (&#8377;)
                      </span>
                    </div>

                    <div className="h-60 w-full min-h-[240px]">
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart
                          data={userType === 'customer' ? spendTrend : earningsTrend}
                        >
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="month"
                            stroke="#64748B"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            stroke="#64748B"
                            fontSize={11}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                          />
                          <Tooltip
                            content={<ExecutiveTooltip currency={true} titlePrefix="Month:" />}
                          />
                          <Area
                            type="monotone"
                            dataKey={userType === 'customer' ? 'spend' : 'earnings'}
                            stroke="#06B6D4"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#areaGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Percentile Distribution Histogram */}
                  <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        Peer Cohort Distribution
                      </h4>
                      <p className="text-xs text-slate-400">
                        Benchmark among all platform {userType}s
                      </p>
                    </div>

                    <div className="h-60 w-full min-h-[240px]">
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={percentileHistogram}>
                          <XAxis
                            dataKey="bracket"
                            stroke="#64748B"
                            fontSize={9}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            stroke="#64748B"
                            fontSize={10}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<ExecutiveTooltip />} />
                          <Bar
                            dataKey="count"
                            fill="#6366F1"
                            radius={[6, 6, 0, 0]}
                            animationDuration={800}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* ROW 2: Radial Donut + Badges Shelf (+ Radar for Customer or Transfer Audit for Agent) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Radial Donut */}
                  <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-2">
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {userType === 'customer' ? 'Order Fulfillment Ratio' : 'SLA Compliance Donut'}
                    </h4>
                    <RadialDonutChart
                      data={userType === 'customer' ? orderOutcomes : slaOutcomes}
                      centerLabel="Total Volume"
                      height={240}
                    />
                  </div>

                  {/* Customer: Category Radar | Agent: Transfer Audit & COD Liability */}
                  {userType === 'customer' && categoryRadar.length > 0 ? (
                    <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-2">
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        Category Affinity Radar
                      </h4>
                      <div className="h-60 w-full min-h-[240px]">
                        <ResponsiveContainer width="100%" height={240}>
                          <RadarChart data={categoryRadar} outerRadius="62%" margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                            <PolarGrid stroke="#334155" opacity={0.3} />
                            <PolarAngleAxis dataKey="category" stroke="#94A3B8" fontSize={9} />
                            <Radar
                              name="Orders"
                              dataKey="score"
                              stroke="#3B82F6"
                              fill="#3B82F6"
                              fillOpacity={0.4}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-3">
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        Agent Dispatch &amp; Emergency Transfer Audit
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-slate-400">3-Min FIFO Acceptance</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {data?.fifoGauge?.acceptanceRate || 98.5}%
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-slate-400">Emergency Transfers Received</span>
                          <span className="font-mono font-bold text-blue-400">
                            {data?.transferAudit?.transfersReceived || 0}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                          <span className="text-slate-400">Emergency Handoffs Initiated</span>
                          <span className="font-mono font-bold text-amber-400">
                            {data?.transferAudit?.transfersInitiated || 0}
                          </span>
                        </div>
                        {data?.codLiability && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                            <span className="text-amber-300 font-semibold">Unsettled Cash Liability</span>
                            <span className="font-mono font-bold text-white">
                              &#8377;{Number(data.codLiability.pendingCashToDeposit || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Milestone Badges Shelf */}
                  <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                    <MilestoneBadgesShelf badges={milestones} />
                  </div>
                </div>

                {/* ROW 3: Full-width 365-Day Activity Heatmap */}
                <ActivityHeatmap
                  days={heatmapDays}
                  colorScheme={userType === 'customer' ? 'sapphire' : 'emerald'}
                  title={`365-Day ${userType === 'customer' ? 'Purchasing' : 'Delivery Fulfillment'} Ledger`}
                  totalActiveDays={data?.heatmap?.totalActiveDays || 0}
                  streak={data?.heatmap?.maxStreak || 0}
                />
              </>
            </ChartErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
};
