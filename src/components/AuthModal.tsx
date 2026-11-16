import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'register' | 'admin';
  notice?: string;
  onClose: () => void;
  onSuccess?: () => void;
  onAdminSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  notice,
  onClose,
  onSuccess,
  onAdminSuccess,
}) => {
  const { login, register, loginWithOAuth, quickLogin, oauthError, clearOAuthError, configuredProviders } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'admin'>(initialTab);

  const isGoogleConfigured = Boolean(configuredProviders?.google);
  const isAppleConfigured = Boolean(configuredProviders?.apple);
  const hasAnyOAuth = isGoogleConfigured || isAppleConfigured;

  // Login form state (customer or admin)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginGlobalError, setLoginGlobalError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin form state
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});
  const [adminGlobalError, setAdminGlobalError] = useState('');
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);

  // OAuth state
  const [isOAuthLoading, setIsOAuthLoading] = useState<'google' | 'apple' | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regGlobalError, setRegGlobalError] = useState('');
  const [regSuccessMessage, setRegSuccessMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Reset all forms cleanly
  const resetForms = () => {
    setLoginEmail('');
    setLoginPassword('');
    setShowLoginPassword(false);
    setLoginErrors({});
    setLoginGlobalError('');

    setAdminIdentifier('');
    setAdminPassword('');
    setShowAdminPassword(false);
    setAdminErrors({});
    setAdminGlobalError('');

    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setShowRegPassword(false);
    setRegPhone('');
    setRegErrors({});
    setRegGlobalError('');
    setRegSuccessMessage('');
  };

  // Reset form inputs whenever modal is opened or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      resetForms();
      if (oauthError) {
        setLoginGlobalError(oauthError);
        clearOAuthError?.();
      }
    }
  }, [isOpen, initialTab, oauthError]);

  if (!isOpen) return null;

  const handleClose = () => {
    resetForms();
    onClose();
  };

  const handleSwitchTab = (newTab: 'login' | 'register' | 'admin') => {
    setTab(newTab);
    resetForms();
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setIsOAuthLoading(provider);
    setLoginGlobalError('');
    setRegGlobalError('');

    const res = await loginWithOAuth(provider);
    if (!res.success && res.message) {
      setIsOAuthLoading(null);
      setLoginGlobalError(res.message);
      setRegGlobalError(res.message);
    }
  };

  // Customer Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginGlobalError('');
    const errors: Record<string, string> = {};

    if (!loginEmail.trim()) {
      errors.email = 'Required field';
    }
    if (!loginPassword.trim()) {
      errors.password = 'Required field';
    }

    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoggingIn(true);
    const res = await login(loginEmail, loginPassword);
    setIsLoggingIn(false);

    if (res.success) {
      resetForms();
      onSuccess?.();
      onClose();
    } else {
      setLoginGlobalError(res.message || 'Invalid email or password');
    }
  };

  // Dedicated Admin Login Submit
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminGlobalError('');
    const errors: Record<string, string> = {};

    if (!adminIdentifier.trim()) {
      errors.identifier = 'Admin username or email is required';
    }
    if (!adminPassword.trim()) {
      errors.password = 'Admin password is required';
    }

    setAdminErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsAdminLoggingIn(true);
    const res = await login(adminIdentifier.trim(), adminPassword.trim(), 'admin');
    setIsAdminLoggingIn(false);

    if (res.success && res.user?.role === 'admin') {
      resetForms();
      if (onAdminSuccess) {
        onAdminSuccess();
      } else if (onSuccess) {
        onSuccess();
      }
      onClose();
    } else {
      setAdminGlobalError(
        res.message || 'Access denied: Unauthorized access. Administrator privileges required.'
      );
    }
  };

  // Customer Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegGlobalError('');
    setRegSuccessMessage('');
    const errors: Record<string, string> = {};

    if (!regName.trim()) {
      errors.name = 'Required field';
    }
    if (!regEmail.trim()) {
      errors.email = 'Required field';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errors.email = 'Invalid email address format';
    }
    if (!regPassword.trim()) {
      errors.password = 'Required field';
    } else if (regPassword.trim().length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setRegErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsRegistering(true);
    const res = await register({
      name: regName,
      email: regEmail,
      password: regPassword,
      phone: regPhone,
    });
    setIsRegistering(false);

    if (res.success) {
      setRegSuccessMessage('Account registered successfully! Redirecting...');
      setTimeout(() => {
        resetForms();
        onSuccess?.();
        onClose();
      }, 1000);
    } else {
      if (res.errors) {
        setRegErrors(res.errors);
      }
      setRegGlobalError(res.message || 'Registration failed');
    }
  };

  return (
    <div
      data-test="auth-modal"
      data-testid="auth-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex bg-slate-200/80 p-1 rounded-xl">
            <button
              data-test="auth-tab-login"
              data-testid="auth-tab-login"
              onClick={() => handleSwitchTab('login')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              data-test="auth-tab-register"
              data-testid="auth-tab-register"
              onClick={() => handleSwitchTab('register')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register
            </button>
            <button
              data-test="auth-tab-admin"
              data-testid="auth-tab-admin"
              onClick={() => handleSwitchTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                tab === 'admin'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Admin</span>
            </button>
          </div>

          <button
            data-test="auth-close-button"
            data-testid="auth-close-button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Checkout Login Notice */}
          {notice && tab !== 'admin' && (
            <div
              data-test="auth-checkout-notice"
              data-testid="auth-checkout-notice"
              className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold flex items-center gap-2.5 shadow-2xs animate-in fade-in duration-200"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="leading-snug">{notice}</span>
            </div>
          )}

          {/* Header Title */}
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              {tab === 'admin' && <ShieldCheck className="w-5 h-5 text-rose-600" />}
              {tab === 'login' && 'Welcome to ShopSphere'}
              {tab === 'register' && 'Create Customer Account'}
              {tab === 'admin' && 'Administrator Portal'}
            </h3>
            <p className="text-xs text-slate-500">
              {tab === 'login' && 'Sign in securely with token authentication or social OAuth'}
              {tab === 'register' && 'Register in seconds with automatic 24-hour token verification'}
              {tab === 'admin' && 'Enter your administrator credentials to access PostgreSQL analytics and management console.'}
            </p>
          </div>

          {/* Social OAuth Buttons (Hidden on Admin Portal, or if no OAuth provider is configured) */}
          {tab !== 'admin' && hasAnyOAuth && (
            <>
              <div className="space-y-2 mb-4">
                {/* Google OAuth */}
                {isGoogleConfigured && (
                  <button
                    type="button"
                    data-test="oauth-google-button"
                    data-testid="oauth-google-button"
                    onClick={() => handleOAuthLogin('google')}
                    disabled={isOAuthLoading !== null}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 shadow-2xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isOAuthLoading === 'google' ? (
                      <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>Continue with Google</span>
                  </button>
                )}

                {/* Apple OAuth */}
                {isAppleConfigured && (
                  <button
                    type="button"
                    data-test="oauth-apple-button"
                    data-testid="oauth-apple-button"
                    onClick={() => handleOAuthLogin('apple')}
                    disabled={isOAuthLoading !== null}
                    className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 shadow-2xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    {isOAuthLoading === 'apple' ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.77-7.97-12.24-14.67-6.05-9.11-10.82-19.73-14.33-31.85-3.5-12.12-5.26-23.85-5.26-35.19 0-14.89 3.51-26.97 10.53-36.24 7.02-9.28 15.82-14.05 26.41-14.33 4.8 0 10.05 1.16 15.75 3.48 5.7 2.33 9.49 3.59 11.37 3.79 2.12-.2 6.02-1.5 11.71-3.9 5.69-2.4 10.63-3.48 14.83-3.26 12.03.74 21.6 5.41 28.71 14.02-10.43 6.32-15.52 14.86-15.28 25.62.24 8.5 3.56 15.67 9.97 21.51 6.4 5.84 14.07 9.17 23 10-2.07 6.1-4.7 12.38-7.89 18.84zm-30.82-104.9c0-6.74 2.45-13.04 7.35-17.9 4.9-4.86 10.9-7.45 18-7.77.22 1.48.33 2.87.33 4.18 0 6.64-2.52 13.06-7.56 18.25-5.04 5.2-11.08 7.97-18.12 8.32z" />
                      </svg>
                    )}
                    <span>Continue with Apple</span>
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-white px-2 text-slate-400">Or continue with email</span>
                </div>
              </div>
            </>
          )}

          {/* =========================================================================
              TAB: ADMIN LOGIN (Clean Manual Form - No Pre-filled Credentials)
             ========================================================================= */}
          {tab === 'admin' && (
            <div className="space-y-4">
              {adminGlobalError && (
                <div
                  data-test="admin-login-error"
                  data-testid="admin-login-error"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{adminGlobalError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      data-test="admin-login-identifier-input"
                      data-testid="admin-login-identifier-input"
                      placeholder="admin or admin@example.com"
                      value={adminIdentifier}
                      onChange={e => setAdminIdentifier(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        adminErrors.identifier ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-rose-500'
                      }`}
                    />
                  </div>
                  {adminErrors.identifier && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">{adminErrors.identifier}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      data-test="admin-login-password-input"
                      data-testid="admin-login-password-input"
                      placeholder="Enter administrator password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className={`w-full pl-9 pr-10 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        adminErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-rose-500'
                      }`}
                    />
                    <button
                      type="button"
                      data-test="admin-password-toggle"
                      data-testid="admin-password-toggle"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                  {adminErrors.password && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">{adminErrors.password}</p>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                    <span>Protected Administrator Area</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Manual authentication required. Valid credentials will redirect immediately to the Admin &amp; Analytics Dashboard.
                  </p>
                </div>

                <button
                  type="submit"
                  data-test="admin-login-submit-button"
                  data-testid="admin-login-submit-button"
                  disabled={isAdminLoggingIn}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isAdminLoggingIn ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Sign In to Admin Dashboard</span>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login')}
                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  &larr; Return to Customer Sign In
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: CUSTOMER SIGN IN
             ========================================================================= */}
          {tab === 'login' && (
            <div className="space-y-4">
              {loginGlobalError && (
                <div data-test="login-error-message" data-testid="login-error-message" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{loginGlobalError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      data-test="login-email-input"
                      data-testid="login-email-input"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        loginErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {loginErrors.email && (
                    <p data-test="login-email-error" data-testid="login-email-error" className="text-[11px] text-rose-500 mt-1 font-semibold">{loginErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      data-test="login-password-input"
                      data-testid="login-password-input"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className={`w-full pl-9 pr-10 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        loginErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      data-test="login-password-toggle"
                      data-testid="login-password-toggle"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p data-test="login-password-error" data-testid="login-password-error" className="text-[11px] text-rose-500 mt-1 font-semibold">{loginErrors.password}</p>
                  )}
                </div>

                {/* Token-Based Security Badge */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Token Auth (JWT Bearer)
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                    <Clock className="w-3 h-3" />
                    24-hour expiry
                  </span>
                </div>

                <button
                  type="submit"
                  data-test="login-submit-button"
                  data-testid="login-submit-button"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isLoggingIn ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Sign In With Token</span>
                  )}
                </button>
              </form>

              {/* QA Customer Quick Login Box (Exclusively customer profiles) */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Customer Test Accounts:
                </p>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    data-test="quick-login-customer1"
                    data-testid="quick-login-customer1"
                    onClick={async () => {
                      await quickLogin('customer1');
                      resetForms();
                      onSuccess?.();
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-900">Jane Customer (Customer 1)</p>
                      <p className="text-[10px] text-slate-500 font-mono">customer@practicesoftwaretesting.com</p>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Customer</span>
                  </button>

                  <button
                    type="button"
                    data-test="quick-login-customer2"
                    data-testid="quick-login-customer2"
                    onClick={async () => {
                      await quickLogin('customer2');
                      resetForms();
                      onSuccess?.();
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-900">Alex Rivera (Customer 2)</p>
                      <p className="text-[10px] text-slate-500 font-mono">customer2@practicesoftwaretesting.com</p>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Customer</span>
                  </button>
                </div>

                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleSwitchTab('admin')}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Administrator? <span className="underline font-bold">Admin Login &rarr;</span></span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: CUSTOMER REGISTRATION
             ========================================================================= */}
          {tab === 'register' && (
            <div className="space-y-4">
              {regGlobalError && (
                <div data-test="register-error-message" data-testid="register-error-message" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{regGlobalError}</span>
                </div>
              )}

              {regSuccessMessage && (
                <div data-test="register-success-message" data-testid="register-success-message" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{regSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      data-test="register-name-input"
                      data-testid="register-name-input"
                      placeholder="e.g. Sarah Connor"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        regErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {regErrors.name && (
                    <p data-test="register-name-error" data-testid="register-name-error" className="text-[11px] text-rose-500 mt-1 font-semibold">{regErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      data-test="register-email-input"
                      data-testid="register-email-input"
                      placeholder="sarah@example.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        regErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {regErrors.email && (
                    <p data-test="register-email-error" data-testid="register-email-error" className="text-[11px] text-rose-500 mt-1 font-semibold">{regErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      data-test="register-password-input"
                      data-testid="register-password-input"
                      placeholder="Minimum 6 characters"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className={`w-full pl-9 pr-10 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        regErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      data-test="register-password-toggle"
                      data-testid="register-password-toggle"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                  {regErrors.password && (
                    <p data-test="register-password-error" data-testid="register-password-error" className="text-[11px] text-rose-500 mt-1 font-semibold">{regErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      data-test="register-phone-input"
                      data-testid="register-phone-input"
                      placeholder="+1 (555) 000-0000"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  data-test="register-submit-button"
                  data-testid="register-submit-button"
                  disabled={isRegistering}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isRegistering ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Create Free Account</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
