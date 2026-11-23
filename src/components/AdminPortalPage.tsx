import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
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
  const [rememberMe, setRememberMe] = useState(true);
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
        title="RESTRICTED"
        subtitle={`Signed in as ${user?.name || user?.email} with customer privileges. Administrator console requires elevated access.`}
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
            className="w-full py-4 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 hover:border-white/60 text-white font-extrabold text-xs uppercase tracking-widest shadow-xl transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Sign Out &amp; Sign In as Admin</span>
          </button>
        </div>
      </AuthGlassLayout>
    );
  }

  // 3. Unauthenticated Administrator Sign In Form (Strict Image 5 Match)
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
      title="LOGIN"
      onNavigateHome={onNavigateHome}
      rememberMeSlot={
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-slate-300 hover:text-white transition-colors">Remember me</span>
        </label>
      }
      forgotPasswordSlot={
        <button
          type="button"
          onClick={handleQuickAdminDemo}
          className="text-slate-300 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
        >
          Quick Demo Login
        </button>
      }
    >
      {errorMsg && (
        <div
          data-test="admin-login-error"
          data-testid="admin-login-error"
          className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleAdminLogin} className="space-y-4">
        {/* Username/Email Pill Input with User Icon on the Right (Image 5) */}
        <div className="relative">
          <input
            type="text"
            data-test="admin-login-identifier"
            data-testid="admin-login-identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Username"
            className="w-full pl-6 pr-14 py-4 bg-white/[0.08] border border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 rounded-full text-white text-sm outline-none transition-all placeholder:text-slate-400 font-medium"
            required
          />
          <UserIcon className="w-5 h-5 text-white/80 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Password Pill Input with Lock Icon on the Right (Image 5) */}
        <div className="relative">
          <input
            type="password"
            data-test="admin-login-password"
            data-testid="admin-login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="************"
            className="w-full pl-6 pr-14 py-4 bg-white/[0.08] border border-white/20 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 rounded-full text-white text-sm outline-none transition-all placeholder:text-slate-400 font-medium tracking-widest"
            required
          />
          <Lock className="w-5 h-5 text-white/80 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* LOGIN Button (Pill shaped with dark glass gradient - Image 5) */}
        <button
          type="submit"
          data-test="btn-admin-login-submit"
          data-testid="btn-admin-login-submit"
          disabled={loading}
          className="w-full py-4 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 hover:border-white/60 text-white font-extrabold text-xs uppercase tracking-[0.25em] shadow-xl hover:shadow-purple-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>LOGGING IN...</span>
            </>
          ) : (
            <span>LOGIN</span>
          )}
        </button>
      </form>

      {/* Quick Demo Access */}
      <div className="pt-2 text-center">
        <button
          type="button"
          data-test="btn-quick-admin-demo"
          data-testid="btn-quick-admin-demo"
          disabled={loading}
          onClick={handleQuickAdminDemo}
          className="w-full py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-purple-300 font-bold text-xs transition-colors cursor-pointer border border-white/10 flex items-center justify-center gap-2"
        >
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>⚡ Fast Administrator Demo Access</span>
        </button>
      </div>
    </AuthGlassLayout>
  );
};
