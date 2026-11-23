import React from 'react';
import { ArrowLeft, Shield, Truck, User } from 'lucide-react';

export type AuthRole = 'customer' | 'agent' | 'admin';

interface AuthGlassLayoutProps {
  role: AuthRole;
  title?: string;
  subtitle?: string;
  onNavigateHome?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isModal?: boolean;
  onClose?: () => void;
  rememberMeSlot?: React.ReactNode;
  forgotPasswordSlot?: React.ReactNode;
}

export const AuthGlassLayout: React.FC<AuthGlassLayoutProps> = ({
  role,
  title = 'LOGIN',
  subtitle,
  onNavigateHome,
  children,
  footer,
  isModal = false,
  onClose,
  rememberMeSlot,
  forgotPasswordSlot,
}) => {
  const roleConfig = {
    customer: {
      label: 'Customer Portal',
      icon: User,
      pillColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      accentGlow: 'from-cyan-500/20 via-blue-600/15 to-transparent',
    },
    agent: {
      label: 'ShopSphere Delivery Partner Portal',
      icon: Truck,
      pillColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      accentGlow: 'from-emerald-500/20 via-teal-600/15 to-transparent',
    },
    admin: {
      label: 'ShopSphere Administrator Portal & Analytics Console',
      icon: Shield,
      pillColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      accentGlow: 'from-purple-500/20 via-indigo-600/15 to-transparent',
    },
  }[role];

  const RoleIcon = roleConfig.icon;

  const cardContent = (
    <div
      data-test={role === 'agent' ? 'delivery-agent-portal-modal' : role === 'admin' ? 'admin-portal-modal' : 'auth-glass-layout'}
      data-testid={role === 'agent' ? 'delivery-agent-portal-modal' : role === 'admin' ? 'admin-portal-modal' : 'auth-glass-layout'}
      className="relative w-full max-w-[440px] mx-auto z-10 animate-in fade-in zoom-in-95 duration-300"
    >
      {/* Outer Glow Halo */}
      <div className="absolute -inset-1 rounded-[56px] bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-orange-500/15 blur-xl pointer-events-none opacity-80" />

      {/* Main Glass Pod Container (Matching Image 5) */}
      <div className="relative rounded-[50px] p-8 sm:p-11 bg-[#090D1A]/75 dark:bg-[#050811]/85 backdrop-blur-3xl border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Subtle Specular Arc Highlight */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        {/* Modal Close Button */}
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20"
          >
            &times;
          </button>
        )}

        {/* Header Section */}
        <div className="text-center space-y-3 mb-7">
          {/* Role Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${roleConfig.pillColor}">
            <RoleIcon className="w-3 h-3" />
            <span>{roleConfig.label}</span>
          </div>

          {/* Title (Matching Image 5 'LOGIN') */}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-[0.2em] uppercase">
            {title}
          </h1>

          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* Form Elements Slot */}
        <div className="relative z-10 space-y-4">
          {children}
        </div>

        {/* Secondary Links: Remember Me & Forgot Password (Matching Image 5) */}
        {(rememberMeSlot || forgotPasswordSlot) && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-5 px-1 font-medium">
            <div>{rememberMeSlot}</div>
            <div>{forgotPasswordSlot}</div>
          </div>
        )}

        {/* Optional Footer */}
        {footer && (
          <div className="mt-6 pt-4 border-t border-white/10 text-center text-[11px] text-slate-500">
            {footer}
          </div>
        )}
      </div>

      {/* Back to storefront link */}
      {!isModal && onNavigateHome && (
        <div className="text-center mt-6">
          <button
            type="button"
            data-test="btn-delivery-back-storefront"
            data-testid="btn-delivery-back-storefront"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Customer Storefront</span>
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return cardContent;
  }

  return (
    <div className="min-h-screen bg-[#030611] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-cyan-500/30">
      {/* =========================================================================
          3D RIBBON NEON MESH WAVES BACKGROUND (Matching Reference Image 5)
         ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Deep ambient background mesh */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-500/10 via-purple-600/10 to-transparent rounded-full blur-[160px]" />

        {/* Floating Neon Mesh Ribbon 1: Purple/Magenta Wave (Right side of Image 5) */}
        <svg
          className="absolute -right-20 top-1/4 w-[650px] h-[650px] opacity-75 transform rotate-12"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="purpleMesh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EC4899" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {Array.from({ length: 18 }).map((_, i) => (
            <path
              key={`purple-line-${i}`}
              d={`M 100,${50 + i * 22} C 250,${150 + i * 15} 400,${20 + i * 25} 550,${200 + i * 20} C 650,${350 + i * 15} 450,${500 + i * 10} 300,${450 + i * 12}`}
              stroke="url(#purpleMesh)"
              strokeWidth="1.2"
              fill="none"
              opacity={0.3 + (i % 3) * 0.2}
            />
          ))}
        </svg>

        {/* Floating Neon Mesh Ribbon 2: Orange/Red/Cyan Wave (Bottom-Left of Image 5) */}
        <svg
          className="absolute -left-28 bottom-0 w-[600px] h-[600px] opacity-70 transform -rotate-12"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="orangeMesh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#EF4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {Array.from({ length: 16 }).map((_, i) => (
            <path
              key={`orange-line-${i}`}
              d={`M 50,${400 + i * 15} C 180,${320 + i * 18} 320,${480 + i * 12} 480,${350 + i * 16} C 560,${250 + i * 14} 420,${150 + i * 10} 250,${220 + i * 12}`}
              stroke="url(#orangeMesh)"
              strokeWidth="1.2"
              fill="none"
              opacity={0.25 + (i % 3) * 0.2}
            />
          ))}
        </svg>

        {/* Soft Radial Center Floor Reflection */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-cyan-500/10 blur-[130px]" />
      </div>

      {/* Main Glass Pod Container */}
      {cardContent}
    </div>
  );
};
