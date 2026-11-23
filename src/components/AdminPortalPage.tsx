import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { AdminPanelModal } from './AdminPanelModal.js';

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
      <div className="min-h-screen bg-slate-950 flex flex-col">
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in fade-in duration-300">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Role Protection Active
            </span>
            <h2 className="text-xl font-black text-white">Administrator Access Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              You are signed in as <strong className="text-white">{user?.name || user?.email}</strong> with customer privileges. The Admin Console is restricted strictly to verified system administrators.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              data-test="btn-admin-switch-account"
              data-testid="btn-admin-switch-account"
              onClick={() => logout()}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Sign Out &amp; Sign In as Admin</span>
            </button>

            <button
              type="button"
              data-test="btn-admin-access-denied-home"
              data-testid="btn-admin-access-denied-home"
              onClick={onNavigateHome}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Customer Storefront</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated Administrator Sign In Form (Protected Login Page for /admin)
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
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Bar */}
      <header className="px-4 sm:px-8 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-tight">ShopSphere Administrator Portal</h1>
            <p className="text-[11px] text-slate-400">Secure Store Management &amp; Analytics Console</p>
          </div>
        </div>

        <button
          type="button"
          data-test="btn-admin-header-home"
          data-testid="btn-admin-header-home"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Customer Storefront</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">Administrator Sign In</h2>
            <p className="text-xs text-slate-400">
              Enter your privileged credentials to manage orders, catalog inventory, and COD cash settlements.
            </p>
          </div>

          {errorMsg && (
            <div
              data-test="admin-login-error"
              data-testid="admin-login-error"
              className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Admin Username or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  data-test="admin-login-identifier"
                  data-testid="admin-login-identifier"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="admin@shopsphere.test or admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-rose-500 rounded-xl text-white text-xs outline-none transition-all placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  data-test="admin-login-password"
                  data-testid="admin-login-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-rose-500 rounded-xl text-white text-xs outline-none transition-all placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              data-test="btn-admin-login-submit"
              data-testid="btn-admin-login-submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-black text-xs shadow-lg transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In as Administrator</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              data-test="btn-quick-admin-demo"
              data-testid="btn-quick-admin-demo"
              disabled={loading}
              onClick={handleQuickAdminDemo}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-extrabold text-xs transition-colors cursor-pointer border border-rose-500/20 flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Quick Admin Sign In (Demo Mode)</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
