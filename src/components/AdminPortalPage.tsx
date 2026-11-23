import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { AdminPanelModal } from './AdminPanelModal.js';
import { AuthGlassLayout } from './auth/AuthGlassLayout.js';

interface AdminPortalPageProps {
  onNavigateHome: () => void;
  onRefreshCatalog: () => void;
}

export const AdminPortalPage: React.FC<AdminPortalPageProps> = ({
  onNavigateHome,
  onRefreshCatalog,
}) => {
  const { user, isAuthenticated, login, quickLogin, logout } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. If user is authenticated as Admin, display the full Admin Console
  if (isAuthenticated && user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-[#060B19] flex flex-col">
        <AdminPanelModal
          isOpen={true}
          onClose={onNavigateHome}
          onRefreshCatalog={onRefreshCatalog}
        />
      </div>
    );
  }

  // 2. If user is authenticated as non-admin (Customer role restriction / Protected Route)
  if (isAuthenticated && user?.role !== 'admin') {
    return (
      <AuthGlassLayout
        role="admin"
        title="Administrator Access Required"
        subtitle={`You are currently signed in as ${user?.name || user?.email} with customer privileges. The Administrator Console is strictly restricted.`}
        onNavigateHome={onNavigateHome}
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <span>Customer account restricted from Admin Panel.</span>
          </div>

          <button
            type="button"
            data-test="btn-admin-switch-account"
            data-testid="btn-admin-switch-account"
            onClick={() => logout()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Sign Out &amp; Sign In as Administrator</span>
          </button>
        </div>
      </AuthGlassLayout>
    );
  }

  // 3. Unauthenticated Administrator Sign In Form (Luminous Frosted Glass)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both your administrator username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(identifier.trim(), password, 'admin');
      if (!res.success) {
        setErrorMsg(res.message || 'Invalid administrator credentials. Access denied.');
      }
    } catch (err: any) {
      setErrorMsg(`Authentication error: ${err.message || 'Server error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminDemo = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await quickLogin('admin');
    } catch (err: any) {
      setErrorMsg(`Quick login error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGlassLayout
      role="admin"
      title="Administrator Console"
      subtitle="Enter privileged credentials to manage live store dispatch, inventory stock, and COD financial settlements."
      onNavigateHome={onNavigateHome}
      footer={
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400">
            Protected by PostgreSQL 18 RBAC &bull; 24h JWT Cryptographic Signature
          </p>
        </div>
      }
    >
      {errorMsg && (
        <div
          data-test="admin-login-error"
          data-testid="admin-login-error"
          className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleAdminLogin} className="space-y-4">
        {/* Glass Capsule Input: Identifier */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Admin Identifier
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-test="admin-login-identifier"
              data-testid="admin-login-identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@shopsphere.test or admin"
              className="w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/10 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-white text-xs outline-none transition-all placeholder:text-slate-500"
              required
            />
          </div>
        </div>

        {/* Glass Capsule Input: Password */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
            Master Password
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              data-test="admin-login-password"
              data-testid="admin-login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/10 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-white text-xs outline-none transition-all placeholder:text-slate-500"
              required
            />
          </div>
        </div>

        {/* Tactile Sapphire Pill Submit */}
        <button
          type="submit"
          data-test="btn-admin-login-submit"
          data-testid="btn-admin-login-submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Authenticating Administrator...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In to Administrator Console</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Access */}
      <div className="pt-2 border-t border-white/10">
        <button
          type="button"
          data-test="btn-quick-admin-demo"
          data-testid="btn-quick-admin-demo"
          disabled={loading}
          onClick={handleQuickAdminDemo}
          className="w-full py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-indigo-300 font-extrabold text-xs transition-colors cursor-pointer border border-white/10 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 text-indigo-400" />
          <span>⚡ Quick Admin Sign In (Demo Mode)</span>
        </button>
      </div>
    </AuthGlassLayout>
  );
};
