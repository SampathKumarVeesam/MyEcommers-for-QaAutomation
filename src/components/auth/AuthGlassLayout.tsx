import React from 'react';
import { ArrowLeft, Shield, Truck, User } from 'lucide-react';

export type AuthRole = 'customer' | 'agent' | 'admin';

interface AuthGlassLayoutProps {
  role: AuthRole;
  title: string;
  subtitle?: string;
  onNavigateHome?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isModal?: boolean;
  onClose?: () => void;
}

export const AuthGlassLayout: React.FC<AuthGlassLayoutProps> = ({
  role,
  title,
  subtitle,
  onNavigateHome,
  children,
  footer,
  isModal = false,
  onClose,
}) => {
  const roleConfig = {
    customer: {
      label: 'Customer Portal',
      icon: User,
      pillColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-blue-500/10',
      glowGradient: 'from-blue-600/25 via-indigo-600/20 to-transparent',
      brandAccent: 'text-blue-400',
    },
    agent: {
      label: 'Delivery Partner Portal',
      icon: Truck,
      pillColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10',
      glowGradient: 'from-emerald-600/25 via-teal-600/20 to-transparent',
      brandAccent: 'text-emerald-400',
    },
    admin: {
      label: 'Administrator Console',
      icon: Shield,
      pillColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-indigo-500/10',
      glowGradient: 'from-indigo-600/25 via-violet-600/20 to-transparent',
      brandAccent: 'text-indigo-400',
    },
  }[role];

  const RoleIcon = roleConfig.icon;

  const content = (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Dynamic Specular Glass Container */}
      <div className="relative rounded-[28px] p-6 sm:p-9 bg-slate-900/60 dark:bg-[#070C1B]/80 backdrop-blur-2xl border border-white/15 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden">
        {/* Subtle Top Specular Border Light */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Modal close button */}
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            &times;
          </button>
        )}

        {/* Role-Aware Top Pill & Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all duration-300 backdrop-blur-md ${roleConfig.pillColor}">
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{roleConfig.label}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Inner Form / Body Content */}
        <div className="relative z-10 space-y-4">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-slate-400">
            {footer}
          </div>
        )}
      </div>

      {/* Return to Storefront button when not in modal */}
      {!isModal && onNavigateHome && (
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Storefront</span>
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return content;
  }

  return (
    <div className="min-h-screen bg-[#05070D] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-blue-500/30">
      {/* Ambient Flowing Neon Mesh Waves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Cyan / Teal Ambient Glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/25 blur-[120px] mix-blend-screen animate-pulse" />
        {/* Royal Indigo Mesh Light */}
        <div className="absolute top-1/4 -right-20 w-[480px] h-[480px] rounded-full bg-indigo-600/30 blur-[140px] mix-blend-screen" />
        {/* Soft Magenta / Violet Wave */}
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[150px] mix-blend-screen" />
        {/* Role Specific Ambient Center Light */}
        <div className={`absolute inset-0 bg-radial ${roleConfig.glowGradient} blur-[160px] pointer-events-none`} />
      </div>

      {/* Center Glass Card */}
      {content}
    </div>
  );
};
