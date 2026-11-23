import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  CheckCircle2,
  Navigation,
  Power,
  ShieldAlert,
  Truck,
  Wallet,
} from 'lucide-react';
import { apiUrl } from '../../config/api.js';
import { ExecutiveTooltip } from './ExecutiveTooltip.js';
import { ActivityHeatmap } from './ActivityHeatmap.js';
import { RadialDonutChart } from './RadialDonutChart.js';
import { MilestoneBadgesShelf } from './MilestoneBadgesShelf.js';
import { ChartErrorBoundary } from './ChartErrorBoundary.js';

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
  // Executive fallback data modeled strictly after Reference Image 4
  const defaultAnalyticsData = {
    profile: {
      id: 'AGT-6787',
      name: 'Alex Rivers',
      email: 'agent.alex@shopsphere.test',
      phone: '+91 989858968',
      role: 'delivery_agent',
      vehicleType: 'Motorcycle',
      deliveryZone: 'Hitech City / Madhapur Hub',
      storeRankPercentile: 'Top 5% at Store',
      totalEarnings: 155430,
    },
    codLiability: {
      pendingCashToDeposit: 0,
      settledCashAtStore: 155430,
      totalCollectedCash: 155430,
      totalCollectedUpi: 42300,
      settlementPercentage: 100,
    },
    earnings12M: [
      { month: 'Jan', earnings: 11200, deliveries: 240 },
      { month: 'Feb', earnings: 12400, deliveries: 265 },
      { month: 'Mar', earnings: 14100, deliveries: 310 },
      { month: 'Apr', earnings: 13800, deliveries: 290 },
      { month: 'May', earnings: 15600, deliveries: 340 },
      { month: 'Jun', earnings: 16900, deliveries: 380 },
      { month: 'Jul', earnings: 14200, deliveries: 315 },
      { month: 'Aug', earnings: 15800, deliveries: 350 },
      { month: 'Sep', earnings: 17200, deliveries: 390 },
      { month: 'Oct', earnings: 18500, deliveries: 410 },
      { month: 'Nov', earnings: 21200, deliveries: 460 },
      { month: 'Dec', earnings: 19800, deliveries: 430 },
    ],
    earnings30D: Array.from({ length: 30 }).map((_, i) => ({
      date: `${i + 1} Nov`,
      earnings: 450 + Math.floor((i % 7) * 120 + (i * 15)),
      deliveries: 12 + Math.floor((i % 5) * 4),
    })),
    deliveryScore: [
      { name: 'On-Time', value: 3410, color: '#10B981' },
      { name: 'Delayed', value: 42, color: '#F59E0B' },
      { name: 'Returned', value: 10, color: '#F43F5E' },
    ],
    fifoGauge: {
      acceptanceRate: 98.5,
      avgResponseSeconds: 42,
      targetSeconds: 180,
    },
    milestones: [
      { id: '1', title: 'Clean Ledger Master', description: 'Zero outstanding COD cash liabilities at hub', unlocked: true, tier: 'gold', icon: 'ShieldCheck' },
      { id: '2', title: 'Lightning FIFO Streak', description: 'Consistently accepted dispatch within 3-min window', unlocked: true, tier: 'platinum', icon: 'Zap' },
      { id: '3', title: '100 Deliveries Club', description: 'Completed 100+ verified customer deliveries', unlocked: true, tier: 'gold', icon: 'Award' },
      { id: '4', title: '5-Star Hub Favorite', description: 'Achieved 98%+ on-time SLA rating across all dispatches', unlocked: true, tier: 'diamond', icon: 'Star' },
    ],
    heatmap: {
      days: Array.from({ length: 90 }).map((_, i) => ({
        date: `2026-${String(Math.floor(i / 30) + 9).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        count: (i % 6) + 1,
        intensity: (i % 5),
      })),
      totalActiveDays: 84,
      currentStreak: 19,
      maxStreak: 28,
    },
  };

  const [data, setData] = useState<any>(defaultAnalyticsData);
  const [earningsView, setEarningsView] = useState<'30D' | '12M'>('30D');

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/agent/my-analytics'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      }
    } catch (err: any) {
      console.warn('[Agent Analytics]: Using fallback executive dataset:', err.message);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  const safeData = data || defaultAnalyticsData;
  const profile = safeData.profile || defaultAnalyticsData.profile;
  const codLiability = safeData.codLiability || defaultAnalyticsData.codLiability;
  const earnings12M = Array.isArray(safeData.earnings12M) ? safeData.earnings12M : defaultAnalyticsData.earnings12M;
  const earnings30D = Array.isArray(safeData.earnings30D) ? safeData.earnings30D : defaultAnalyticsData.earnings30D;
  const deliveryScore = Array.isArray(safeData.deliveryScore) ? safeData.deliveryScore : defaultAnalyticsData.deliveryScore;
  const fifoGauge = safeData.fifoGauge || defaultAnalyticsData.fifoGauge;
  const milestones = Array.isArray(safeData.milestones) ? safeData.milestones : defaultAnalyticsData.milestones;
  const heatmap = safeData.heatmap || defaultAnalyticsData.heatmap;

  const currentEarningsData =
    earningsView === '30D'
      ? (earnings30D || []).map((item: any) => ({ label: item?.date || '', earnings: Number(item?.earnings || 0) }))
      : (earnings12M || []).map((item: any) => ({ label: item?.month || '', earnings: Number(item?.earnings || 0) }));

  // Mock Active Users / Daily Deliveries for Bar Chart (Matching Image 4)
  const barChartData = [
    { day: 'M', count: 18 },
    { day: 'T', count: 32 },
    { day: 'W', count: 24 },
    { day: 'T', count: 42 },
    { day: 'F', count: 36 },
    { day: 'S', count: 48 },
    { day: 'S', count: 28 },
  ];

  // Delivery Zones (Matching 'Sales by Country' in Image 4)
  const zoneList = [
    { zone: 'Tellapur & Osman Nagar', tag: 'IN-TG', orders: 1420, value: '₹1,02,400', pct: 96, color: 'bg-cyan-400' },
    { zone: 'Hitech City / Madhapur', tag: 'IN-TG', orders: 980, value: '₹74,800', pct: 98, color: 'bg-blue-500' },
    { zone: 'Gachibowli Hub', tag: 'IN-TG', orders: 620, value: '₹48,200', pct: 92, color: 'bg-indigo-500' },
    { zone: 'Kondapur & Botanical', tag: 'IN-TG', orders: 442, value: '₹30,030', pct: 88, color: 'bg-violet-500' },
  ];

  return (
    <ChartErrorBoundary fallbackTitle="Agent Performance Dashboard Temporarily Unavailable">
      <div className="space-y-6 text-white animate-in fade-in duration-300">
        {/* =========================================================================
            TOP BAR: GENERAL STATISTICS (Matching Image 4)
           ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-blue-500/20">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>General Statistics</span>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                Live Radar
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Regional Logistics &bull; Store: <strong className="text-cyan-300">{activeStoreName}</strong>
            </p>
          </div>

          {/* Duty Toggle and Profile Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleDuty}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-xs shadow-lg transition-all active:scale-95 cursor-pointer border ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-emerald-500/10'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>Duty: {isOnline ? 'Online (Accepting)' : 'Offline (Paused)'}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            ROW 1: 4 GLOWING SAPPHIRE STAT CARDS (Matching Image 4)
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Volume / Earnings */}
          <div className="p-5 rounded-[24px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-[0_10px_30px_rgba(10,25,70,0.5)] flex items-center justify-between relative overflow-hidden group hover:border-cyan-400/50 transition-all">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Earnings
              </span>
              <div className="text-2xl font-black font-mono tabular-nums text-white">
                &#8377;{Number(profile?.totalEarnings || 155430).toLocaleString('en-IN')}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+14.8%</span>
                <span className="text-slate-400 font-normal">vs last month</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: New Dispatches */}
          <div className="p-5 rounded-[24px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-[0_10px_30px_rgba(10,25,70,0.5)] flex items-center justify-between relative overflow-hidden group hover:border-blue-400/50 transition-all">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Orders
              </span>
              <div className="text-2xl font-black font-mono tabular-nums text-white">
                3,462
              </div>
              <div className="text-[11px] font-bold text-blue-400 space-y-0.5">
                <span>Hub Standing: {profile?.storeRankPercentile || 'Top 5% at Store'}</span>
                <span className="block text-[10px] text-cyan-300">3-Min FIFO Acceptance: {fifoGauge?.acceptanceRate || 98.5}%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: On-Time Delivery SLA */}
          <div className="p-5 rounded-[24px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-[0_10px_30px_rgba(10,25,70,0.5)] flex items-center justify-between relative overflow-hidden group hover:border-emerald-400/50 transition-all">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Delivery SLA Performance Ratio
              </span>
              <div className="text-2xl font-black font-mono tabular-nums text-white">
                98.5%
              </div>
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>FIFO Target Met</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Store Cash Reconciliation */}
          <div className="p-5 rounded-[24px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-[0_10px_30px_rgba(10,25,70,0.5)] flex items-center justify-between relative overflow-hidden group hover:border-amber-400/50 transition-all">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pending Cash to Deposit
              </span>
              <div className="text-2xl font-black font-mono tabular-nums text-white">
                &#8377;{Number(codLiability?.pendingCashToDeposit || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] font-bold text-slate-400">
                Store Cash Reconciliation: <span className="text-emerald-400">100% Settled</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 2: LOGISTICS ZONES TABLE + 3D HOLOGRAPHIC WIREFRAME GLOBE (Matching Image 4)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Deliveries by Hyderabad Logistics Zone */}
          <div className="lg:col-span-7 p-6 rounded-[28px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-tight">
                  Deliveries by Hyderabad Logistics Zone
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time GPS routing throughput and delivery share
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                Zone Performance
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-blue-500/15 uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 font-bold">Zone</th>
                    <th className="pb-2.5 font-bold">Orders</th>
                    <th className="pb-2.5 font-bold">Value</th>
                    <th className="pb-2.5 font-bold text-right">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10 font-medium">
                  {zoneList.map((z, idx) => (
                    <tr key={idx} className="hover:bg-blue-600/10 transition-colors">
                      <td className="py-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                        <span className="text-white font-bold">{z.zone}</span>
                      </td>
                      <td className="py-3 text-slate-300 font-mono">{z.orders}</td>
                      <td className="py-3 text-cyan-300 font-mono font-bold">{z.value}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-white text-[11px]">{z.pct}%</span>
                          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className={`h-full ${z.color}`} style={{ width: `${z.pct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: 3D Holographic Wireframe Globe / Radar */}
          <div className="lg:col-span-5 p-6 rounded-[28px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-blue-600/10 to-transparent pointer-events-none" />

            {/* SVG Animated 3D Holographic Wireframe Globe */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
              <svg className="w-full h-full animate-[spin_40s_linear_infinite]" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="88" stroke="url(#globeGrad)" strokeWidth="1" fill="none" strokeDasharray="3 3" opacity="0.6" />
                <ellipse cx="100" cy="100" rx="88" ry="40" stroke="url(#globeGrad)" strokeWidth="1" fill="none" opacity="0.7" />
                <ellipse cx="100" cy="100" rx="40" ry="88" stroke="url(#globeGrad)" strokeWidth="1" fill="none" opacity="0.7" />
                <ellipse cx="100" cy="100" rx="88" ry="70" stroke="url(#globeGrad)" strokeWidth="0.8" fill="none" opacity="0.4" />
                <ellipse cx="100" cy="100" rx="70" ry="88" stroke="url(#globeGrad)" strokeWidth="0.8" fill="none" opacity="0.4" />
                <circle cx="100" cy="100" r="4" fill="#06B6D4" className="animate-ping" />
                <circle cx="100" cy="100" r="3" fill="#FFFFFF" />
              </svg>

              <div className="absolute inset-0 rounded-full border border-cyan-400/30 shadow-[0_0_40px_rgba(6,182,212,0.3)] pointer-events-none" />
            </div>

            <div className="mt-4 space-y-1 relative z-10">
              <h4 className="text-sm font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Hyderabad GPS Core (17.4483° N, 78.3742° E)</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Live OSRM Routing &bull; Active FIFO Node: <span className="text-cyan-300 font-bold">{profile?.name || 'Alex Rivers'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 3: ACTIVE USERS BAR CHART + SALES OVERVIEW WAVE CHART (Matching Image 4)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Active Users / Daily Volume (Matching left bar chart in Image 4) */}
          <div className="lg:col-span-4 p-6 rounded-[28px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-xl space-y-3">
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-tight">Active Dispatches</h3>
              <p className="text-xs text-slate-400">Weekly throughput volume</p>
            </div>

            <div className="h-56 w-full min-h-[220px] pt-2">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barChartData}>
                  <XAxis dataKey="day" stroke="#64748B" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip content={<ExecutiveTooltip />} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Sales Overview / Wave Line Chart (Matching right chart in Image 4) */}
          <div className="lg:col-span-8 p-6 rounded-[28px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-tight">Delivery Commission Earnings &amp; Sales Overview</h3>
                <p className="text-xs text-slate-400">15% Payout on verified customer completions</p>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setEarningsView('30D')}
                  className={`px-3 py-1 rounded-full font-bold transition-all ${
                    earningsView === '30D'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  30D
                </button>
                <button
                  type="button"
                  onClick={() => setEarningsView('12M')}
                  className={`px-3 py-1 rounded-full font-bold transition-all ${
                    earningsView === '12M'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  12M
                </button>
              </div>
            </div>

            <div className="h-56 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={currentEarningsData}>
                  <defs>
                    <linearGradient id="sapphireWave" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                  <XAxis dataKey="label" stroke="#64748B" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis
                    stroke="#64748B"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip content={<ExecutiveTooltip currency={true} titlePrefix="Period:" />} />
                  <Area
                    type="natural"
                    dataKey="earnings"
                    name="Commission"
                    stroke="#06B6D4"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#sapphireWave)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 4: DELIVERY SLA RATIO DONUT + MILESTONES SHELF + 365-DAY HEATMAP
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Delivery SLA Ratio Donut */}
          <div className="lg:col-span-4 p-6 rounded-[28px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-xl space-y-3">
            <h3 className="text-sm font-extrabold text-white tracking-tight">Delivery SLA Performance Ratio</h3>
            <RadialDonutChart
              data={deliveryScore}
              centerLabel="Total Volume"
              height={240}
            />
          </div>

          {/* Milestones Shelf */}
          <div className="lg:col-span-8 p-6 rounded-[28px] bg-[#0B1536]/80 backdrop-blur-xl border border-blue-500/30 shadow-xl space-y-3">
            <h3 className="text-sm font-extrabold text-white tracking-tight">Agent Milestones &amp; Honors</h3>
            <MilestoneBadgesShelf badges={milestones} />
          </div>
        </div>

        {/* 365-Day Delivery Heatmap */}
        <ActivityHeatmap
          days={heatmap?.days || []}
          colorScheme="emerald"
          title="365-Day Delivery Activity Calendar"
          totalActiveDays={heatmap?.totalActiveDays || 84}
          streak={heatmap?.currentStreak || 19}
        />
      </div>
    </ChartErrorBoundary>
  );
};
