import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'register';
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onSuccess,
}) => {
  const { login, register, quickLogin } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [loginGlobalError, setLoginGlobalError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regGlobalError, setRegGlobalError] = useState('');
  const [regSuccessMessage, setRegSuccessMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  if (!isOpen) return null;

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
      onSuccess?.();
      onClose();
    } else {
      setLoginGlobalError(res.message || 'Invalid email or password');
    }
  };

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => {
                setTab('login');
                setLoginGlobalError('');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab('register');
                setRegGlobalError('');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* LOGIN TAB */}
          {tab === 'login' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Welcome Back</h3>
                <p className="text-xs text-slate-500">Sign in to access your orders and basket</p>
              </div>

              {loginGlobalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
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
                      placeholder="admin@practicesoftwaretesting.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        loginErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">{loginErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        loginErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {loginErrors.password && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">{loginErrors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isLoggingIn ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>

              {/* 1-Click QA Quick Login Box */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Pre-configured Test Accounts:
                </p>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await quickLogin('admin');
                      onSuccess?.();
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">Sampath Kumar (Admin)</p>
                      <p className="text-[10px] text-slate-500 font-mono">admin@practicesoftwaretesting.com / welcome01</p>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await quickLogin('customer1');
                      onSuccess?.();
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">Jane Customer (Customer 1)</p>
                      <p className="text-[10px] text-slate-500 font-mono">customer@practicesoftwaretesting.com / User01</p>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Customer</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REGISTER TAB */}
          {tab === 'register' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Account</h3>
                <p className="text-xs text-slate-500">Sign up with instant validation</p>
              </div>

              {regGlobalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{regGlobalError}</span>
                </div>
              )}

              {regSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
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
                      placeholder="Jane Doe"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        regErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {regErrors.name && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">{regErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="user@example.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        regErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {regErrors.email && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">{regErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-slate-50/50 outline-none focus:bg-white transition-all ${
                        regErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {regErrors.password && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">{regErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isRegistering ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Create Customer Account</span>
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
