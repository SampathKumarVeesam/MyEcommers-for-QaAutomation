import React from 'react';
import { Award, CheckCircle2, Lock, ShieldCheck, Star, Zap } from 'lucide-react';

export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  tier: 'gold' | 'platinum' | 'diamond' | 'bronze' | string;
  icon?: string;
}

interface MilestoneBadgesShelfProps {
  badges: MilestoneBadge[];
  title?: string;
}

export const MilestoneBadgesShelf: React.FC<MilestoneBadgesShelfProps> = ({
  badges,
  title = 'Unlocked Achievements & Milestones',
}) => {
  const getBadgeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return ShieldCheck;
      case 'Zap':
        return Zap;
      case 'Star':
        return Star;
      case 'CheckCircle2':
        return CheckCircle2;
      default:
        return Award;
    }
  };

  const getTierStyles = (tier: string, unlocked: boolean) => {
    if (!unlocked) {
      return {
        bg: 'bg-white/[0.02]',
        border: 'border-white/5 opacity-50',
        badge: 'bg-slate-800 text-slate-500',
        text: 'text-slate-500',
      };
    }

    switch (tier) {
      case 'diamond':
        return {
          bg: 'bg-gradient-to-br from-cyan-500/10 to-blue-500/5',
          border: 'border-cyan-500/30 shadow-cyan-500/10',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          text: 'text-cyan-400',
        };
      case 'platinum':
        return {
          bg: 'bg-gradient-to-br from-indigo-500/10 to-purple-500/5',
          border: 'border-indigo-500/30 shadow-indigo-500/10',
          badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          text: 'text-indigo-400',
        };
      case 'gold':
        return {
          bg: 'bg-gradient-to-br from-amber-500/10 to-yellow-500/5',
          border: 'border-amber-500/30 shadow-amber-500/10',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          text: 'text-amber-400',
        };
      default: // bronze
        return {
          bg: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5',
          border: 'border-emerald-500/30 shadow-emerald-500/10',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          text: 'text-emerald-400',
        };
    }
  };

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            {badges.filter((b) => b.unlocked).length} / {badges.length} Unlocked
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {badges.map((badge) => {
          const styles = getTierStyles(badge.tier, badge.unlocked);
          const Icon = getBadgeIcon(badge.icon);

          return (
            <div
              key={badge.id}
              className={`p-3.5 rounded-2xl border ${styles.bg} ${styles.border} backdrop-blur-md flex items-start gap-3 transition-all duration-200`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${styles.badge}`}
              >
                {badge.unlocked ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-white tracking-tight">
                    {badge.title}
                  </h5>
                  {badge.unlocked && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                      {badge.tier}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {badge.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
