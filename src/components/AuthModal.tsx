import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api.js';
import { useAuth } from '../context/AuthContext.js';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'register' | 'admin' | 'forgot' | 'reset';
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
  const [tab, setTab] = useState<'login' | 'register' | 'admin' | 'forgot' | 'reset'>(initialTab);

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

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Reset Password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

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

    setForgotEmail('');
    setForgotLoading(false);
    setForgotError('');
    setForgotSuccess('');

    setResetEmail('');
    setResetOtp('');
    setResetToken('');
    setResetPassword('');
    setResetConfirmPassword('');
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
    setResetLoading(false);
    setResetError('');
    setResetSuccess('');

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
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const queryStr = search ? search.slice(1) : (hash.includes('?') ? hash.split('?')[1] : '');
      const params = new URLSearchParams(queryStr);
      const action = params.get('action');
      const emailParam = params.get('email');
      const tokenParam = params.get('token');

      resetForms();

      if (hash.includes('reset-password') || action === 'reset-password') {
        setTab('reset');
        if (emailParam) setResetEmail(decodeURIComponent(emailParam));
        if (tokenParam) setResetToken(tokenParam);
      } else if (hash.includes('forgot-password') || action === 'forgot-password') {
        setTab('forgot');
        if (emailParam) setForgotEmail(decodeURIComponent(emailParam));
      } else {
        setTab(initialTab);
        if (emailParam) {
          setLoginEmail(decodeURIComponent(emailParam));
        }
      }

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

  const handleSwitchTab = (newTab: 'login' | 'register' | 'admin' | 'forgot' | 'reset') => {
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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail || !forgotEmail.trim()) {
      setForgotError('Please enter your registered email address');
      setForgotLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotSuccess(data.message || 'OTP and password reset link sent to your registered email!');
        setResetEmail(forgotEmail.trim());
      } else {
        setForgotError(data.message || 'Failed to send password reset request');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    if (!resetEmail.trim()) {
      setResetError('Email address is required');
      setResetLoading(false);
      return;
    }
    if (!resetOtp.trim() && !resetToken.trim()) {
      setResetError('Please enter the 6-digit verification OTP from your email');
      setResetLoading(false);
      return;
    }
    if (!resetPassword || resetPassword.length < 6) {
      setResetError('New password must be at least 6 characters long');
      setResetLoading(false);
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match. Please re-enter.');
      setResetLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: resetOtp.trim(),
          token: resetToken.trim() || undefined,
          newPassword: resetPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccess(data.message || 'Password reset successfully! Redirecting to sign in...');
        setTimeout(() => {
          setLoginEmail(resetEmail.trim());
          setTab('login');
          setResetSuccess('');
        }, 1500);
      } else {
        setResetError(data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setResetError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      data-test="auth-modal"
      data-testid="auth-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#030611] backdrop-blur-2xl flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      {/* 3D RIBBON NEON MESH WAVES BACKGROUND (Matching Reference Image 5) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-500/10 via-purple-600/10 to-transparent rounded-full blur-[160px]" />

        {/* Purple/Magenta Wave (Right side of Image 5) */}
        <svg
          className="absolute -right-20 top-1/4 w-[650px] h-[650px] opacity-75 transform rotate-12"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="blur(30px)">
            {Array.from({ length: 18 }).map((_, i) => (
              <path
                key={`p-mesh-${i}`}
                d={`M 100 ${120 + i * 16} C 280 ${50 + i * 18}, 420 ${280 + i * 14}, 580 ${160 + i * 20}`}
                stroke={`rgba(${168 + i * 4}, ${40 + i * 6}, ${240 - i * 5}, ${0.35 - i * 0.015})`}
                strokeWidth="2.5"
              />
            ))}
          </g>
        </svg>

        {/* Orange/Cyan Wave (Left side of Image 5) */}
        <svg
          className="absolute -left-28 bottom-1/4 w-[700px] h-[700px] opacity-70 transform -rotate-12"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="blur(32px)">
            {Array.from({ length: 16 }).map((_, i) => (
              <path
                key={`c-mesh-${i}`}
                d={`M 20 ${350 - i * 14} C 160 ${460 - i * 16}, 360 ${220 - i * 14}, 550 ${380 - i * 18}`}
                stroke={
                  i < 8
                    ? `rgba(249, 115, 22, ${0.4 - i * 0.02})`
                    : `rgba(6, 182, 212, ${0.35 - (i - 8) * 0.02})`
                }
                strokeWidth="2.5"
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Main Glass Pod Container (Matching Image 5) */}
      <div className="relative w-full max-w-[440px] mx-auto z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute -inset-1 rounded-[56px] bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-orange-500/15 blur-xl pointer-events-none opacity-80" />

        <div
          className="relative rounded-[50px] p-7 sm:p-9 bg-[#090D1A]/85 backdrop-blur-3xl border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden text-white"
          onClick={e => e.stopPropagation()}
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            data-test="auth-close-button"
            data-testid="auth-close-button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-20"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Section */}
          <div className="text-center space-y-2.5 mb-6">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${
              tab === 'admin'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}>
              <ShieldCheck className="w-3 h-3" />
              <span>{tab === 'admin' ? 'Administrator Console' : 'Customer Portal'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-[0.2em] uppercase">
              {tab === 'login' ? 'LOGIN' : tab === 'register' ? 'REGISTER' : tab === 'forgot' ? 'RECOVER' : tab === 'reset' ? 'RESET' : 'ADMIN'}
            </h1>

            {notice && tab !== 'admin' && (
              <div
                data-test="auth-checkout-notice"
                data-testid="auth-checkout-notice"
                className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center gap-2 shadow-2xs"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px] leading-snug">{notice}</span>
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-white/5 p-1 rounded-full border border-white/10 text-xs font-bold mb-5">
            <button
              data-test="auth-tab-login"
              data-testid="auth-tab-login"
              onClick={() => handleSwitchTab('login')}
              className={`flex-1 py-1.5 rounded-full transition-all text-center cursor-pointer ${
                tab === 'login'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              data-test="auth-tab-register"
              data-testid="auth-tab-register"
              onClick={() => handleSwitchTab('register')}
              className={`flex-1 py-1.5 rounded-full transition-all text-center cursor-pointer ${
                tab === 'register'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
            <button
              data-test="auth-tab-admin"
              data-testid="auth-tab-admin"
              onClick={() => handleSwitchTab('admin')}
              className={`px-3 py-1.5 rounded-full transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                tab === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Admin</span>
            </button>
          </div>

          {/* Social OAuth Buttons */}
          {tab !== 'admin' && hasAnyOAuth && (
            <div className="space-y-2 mb-4">
              {isGoogleConfigured && (
                <button
                  type="button"
                  data-test="oauth-google-button"
                  data-testid="oauth-google-button"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={isOAuthLoading !== null}
                  className="w-full py-3 px-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 text-white rounded-full text-xs font-bold flex items-center justify-center gap-2.5 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isOAuthLoading === 'google' ? (
                    <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
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
            </div>
          )}

          {/* TAB: CUSTOMER SIGN IN (Matching Reference Image 5) */}
          {tab === 'login' && (
            <div className="space-y-4">
              {loginGlobalError && (
                <div data-test="login-error-message" data-testid="login-error-message" className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{loginGlobalError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    data-test="login-email-input"
                    data-testid="login-email-input"
                    placeholder="Username or Email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full pl-6 pr-14 py-3.5 bg-white/[0.08] border border-white/20 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 rounded-full text-white text-xs font-medium outline-none transition-all placeholder:text-slate-400"
                  />
                  <User className="w-5 h-5 text-white/80 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {loginErrors.email && (
                  <p data-test="login-email-error" data-testid="login-email-error" className="text-[11px] text-rose-400 px-4 font-semibold">{loginErrors.email}</p>
                )}

                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    data-test="login-password-input"
                    data-testid="login-password-input"
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full pl-6 pr-14 py-3.5 bg-white/[0.08] border border-white/20 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 rounded-full text-white text-xs font-medium outline-none transition-all placeholder:text-slate-400 tracking-wider"
                  />
                  <button
                    type="button"
                    data-test="login-password-toggle"
                    data-testid="login-password-toggle"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white focus:outline-none cursor-pointer"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p data-test="login-password-error" data-testid="login-password-error" className="text-[11px] text-rose-400 px-4 font-semibold">{loginErrors.password}</p>
                )}

                {/* Remember Me & Forgot Password (Image 5) */}
                <div className="flex items-center justify-between text-xs text-slate-300 px-2 pt-1 font-medium">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="hover:text-white transition-colors">Remember me</span>
                  </label>
                  <button
                    type="button"
                    data-test="link-forgot-password"
                    data-testid="link-forgot-password"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      handleSwitchTab('forgot');
                    }}
                    className="hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* LOGIN Button (Pill shaped with dark glass gradient - Image 5) */}
                <button
                  type="submit"
                  data-test="login-submit-button"
                  data-testid="login-submit-button"
                  disabled={isLoggingIn}
                  className="w-full py-4 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 hover:border-white/60 text-white font-extrabold text-xs uppercase tracking-[0.25em] shadow-xl hover:shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>LOGGING IN...</span>
                    </>
                  ) : (
                    <span>LOGIN</span>
                  )}
                </button>
              </form>

              {/* Quick Customer Demo Shortcuts */}
              <div className="pt-3 border-t border-white/10 space-y-2">
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
                  className="w-full text-left p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all flex items-center justify-between text-xs cursor-pointer px-4 text-slate-300 hover:text-white"
                >
                  <span className="font-bold">⚡ Demo: Jane Customer</span>
                  <span className="text-[10px] font-mono text-cyan-300">Quick Sign In &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: CUSTOMER REGISTRATION (Matching Image 5) */}
          {tab === 'register' && (
            <div className="space-y-4">
              {regGlobalError && (
                <div data-test="register-error-message" data-testid="register-error-message" className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{regGlobalError}</span>
                </div>
              )}

              {regSuccessMessage && (
                <div data-test="register-success-message" data-testid="register-success-message" className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{regSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="relative">
                  <input
                    type="text"
                    data-test="register-name-input"
                    data-testid="register-name-input"
                    placeholder="Full Name"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full pl-6 pr-14 py-3 bg-white/[0.08] border border-white/20 focus:border-cyan-400 rounded-full text-white text-xs outline-none transition-all placeholder:text-slate-400"
                  />
                  <User className="w-4 h-4 text-white/70 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {regErrors.name && (
                  <p data-test="register-name-error" data-testid="register-name-error" className="text-[11px] text-rose-400 px-4 font-semibold">{regErrors.name}</p>
                )}

                <div className="relative">
                  <input
                    type="email"
                    data-test="register-email-input"
                    data-testid="register-email-input"
                    placeholder="Email Address"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="w-full pl-6 pr-14 py-3 bg-white/[0.08] border border-white/20 focus:border-cyan-400 rounded-full text-white text-xs outline-none transition-all placeholder:text-slate-400"
                  />
                  <Mail className="w-4 h-4 text-white/70 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {regErrors.email && (
                  <p data-test="register-email-error" data-testid="register-email-error" className="text-[11px] text-rose-400 px-4 font-semibold">{regErrors.email}</p>
                )}

                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    data-test="register-password-input"
                    data-testid="register-password-input"
                    placeholder="Password (min 6 characters)"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full pl-6 pr-14 py-3 bg-white/[0.08] border border-white/20 focus:border-cyan-400 rounded-full text-white text-xs outline-none transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    data-test="register-password-toggle"
                    data-testid="register-password-toggle"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                </div>
                {regErrors.password && (
                  <p data-test="register-password-error" data-testid="register-password-error" className="text-[11px] text-rose-400 px-4 font-semibold">{regErrors.password}</p>
                )}

                <div className="relative">
                  <input
                    type="tel"
                    data-test="register-phone-input"
                    data-testid="register-phone-input"
                    placeholder="Phone (Optional)"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="w-full pl-6 pr-14 py-3 bg-white/[0.08] border border-white/20 focus:border-cyan-400 rounded-full text-white text-xs outline-none transition-all placeholder:text-slate-400"
                  />
                  <Phone className="w-4 h-4 text-white/70 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  data-test="register-submit-button"
                  data-testid="register-submit-button"
                  disabled={isRegistering}
                  className="w-full py-4 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 hover:border-white/60 text-white font-extrabold text-xs uppercase tracking-[0.25em] shadow-xl hover:shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {isRegistering ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>CREATE ACCOUNT</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB: ADMIN LOGIN (Within AuthModal) */}
          {tab === 'admin' && (
            <div className="space-y-4">
              {adminGlobalError && (
                <div data-test="admin-login-error" data-testid="admin-login-error" className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{adminGlobalError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    data-test="admin-login-identifier-input"
                    data-testid="admin-login-identifier-input"
                    placeholder="Admin Username or Email"
                    value={adminIdentifier}
                    onChange={e => setAdminIdentifier(e.target.value)}
                    className="w-full pl-6 pr-14 py-3.5 bg-white/[0.08] border border-white/20 focus:border-purple-400 rounded-full text-white text-xs outline-none transition-all placeholder:text-slate-400"
                  />
                  <User className="w-5 h-5 text-white/80 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    data-test="admin-login-password-input"
                    data-testid="admin-login-password-input"
                    placeholder="Admin Password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full pl-6 pr-14 py-3.5 bg-white/[0.08] border border-white/20 focus:border-purple-400 rounded-full text-white text-xs outline-none transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    data-test="admin-password-toggle"
                    data-testid="admin-password-toggle"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
                  >
                    {showAdminPassword ? <EyeOff className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  data-test="admin-login-submit-button"
                  data-testid="admin-login-submit-button"
                  disabled={isAdminLoggingIn}
                  className="w-full py-4 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 hover:border-white/60 text-white font-extrabold text-xs uppercase tracking-[0.25em] shadow-xl hover:shadow-purple-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {isAdminLoggingIn ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>LOGIN AS ADMIN</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB: FORGOT & RESET PASSWORD */}
          {tab === 'forgot' && (
            <div className="space-y-4">
              {forgotError && (
                <div data-test="forgot-error-message" data-testid="forgot-error-message" className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{forgotError}</span>
                </div>
              )}
              {forgotSuccess && (
                <div data-test="forgot-success-message" data-testid="forgot-success-message" className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{forgotSuccess}</span>
                  </div>
                  <button
                    type="button"
                    data-test="btn-proceed-to-reset"
                    data-testid="btn-proceed-to-reset"
                    onClick={() => handleSwitchTab('reset')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
                  >
                    Enter 6-Digit OTP &amp; Reset Password &rarr;
                  </button>
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="email"
                    required
                    data-test="forgot-email-input"
                    data-testid="forgot-email-input"
                    placeholder="Registered Email Address"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full pl-6 pr-14 py-3.5 bg-white/[0.08] border border-white/20 focus:border-cyan-400 rounded-full text-white text-xs outline-none transition-all placeholder:text-slate-400"
                  />
                  <Mail className="w-5 h-5 text-white/80 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  data-test="forgot-submit-button"
                  data-testid="forgot-submit-button"
                  disabled={forgotLoading}
                  className="w-full py-4 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 hover:border-white/60 text-white font-extrabold text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>SEND RECOVERY OTP</span>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login')}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  &larr; Back to Login
                </button>
              </div>
            </div>
          )}

          {tab === 'reset' && (
            <div className="space-y-4">
              {resetError && (
                <div data-test="reset-error-message" data-testid="reset-error-message" className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{resetError}</span>
                </div>
              )}
              {resetSuccess && (
                <div data-test="reset-success-message" data-testid="reset-success-message" className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                <div className="relative">
                  <input
                    type="email"
                    required
                    data-test="reset-email-input"
                    data-testid="reset-email-input"
                    placeholder="Registered Email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className="w-full pl-6 pr-14 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                  />
                  <Mail className="w-4 h-4 text-white/70 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    data-test="reset-otp-input"
                    data-testid="reset-otp-input"
                    placeholder="6-Digit OTP"
                    value={resetOtp}
                    onChange={e => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-sm font-mono font-bold tracking-widest text-center outline-none"
                  />
                </div>

                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    data-test="reset-password-input"
                    data-testid="reset-password-input"
                    placeholder="New Password"
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    className="w-full pl-6 pr-14 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showResetConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    data-test="reset-confirm-password-input"
                    data-testid="reset-confirm-password-input"
                    placeholder="Confirm New Password"
                    value={resetConfirmPassword}
                    onChange={e => setResetConfirmPassword(e.target.value)}
                    className="w-full pl-6 pr-14 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  >
                    {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  data-test="reset-submit-button"
                  data-testid="reset-submit-button"
                  disabled={resetLoading}
                  className="w-full py-4 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 hover:border-white/60 text-white font-extrabold text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>UPDATE PASSWORD</span>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('login')}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  &larr; Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
