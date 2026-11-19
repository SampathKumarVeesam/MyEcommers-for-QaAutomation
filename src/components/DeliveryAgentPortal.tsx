import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  User as UserIcon,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api.js';
import { DeliveryAgent, Gender, Order } from '../types.js';
import { GENDER_PRESET_AVATARS, ProfileModal } from './ProfileModal.js';

interface DeliveryAgentPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AGENT_TOKEN_KEY = 'shopsphere_agent_token';

export const DeliveryAgentPortal: React.FC<DeliveryAgentPortalProps> = ({ isOpen, onClose }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AGENT_TOKEN_KEY) || null);
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'verify'>('login');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState<Gender>('male');
  const [regVehicle, setRegVehicle] = useState('Motorcycle');
  const [regZone, setRegZone] = useState('Central Hub');
  const [regAvatar, setRegAvatar] = useState(GENDER_PRESET_AVATARS.male[0]);

  // Verification form
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [issuedTempPassword, setIssuedTempPassword] = useState<string | null>(null);

  // Mandatory / voluntary password update
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Portal dashboard
  const [activeTab, setActiveTab] = useState<'deliveries' | 'earnings'>('deliveries');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Settlement action states
  const [inputOtp, setInputOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [settling, setSettling] = useState(false);

  // Profile modal trigger
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle URL hash / search params on open
  useEffect(() => {
    if (isOpen) {
      const searchParams = new URLSearchParams(window.location.search);
      const urlEmail = searchParams.get('verifyEmail');
      const urlToken = searchParams.get('token');
      if (urlEmail && urlToken) {
        setAuthTab('verify');
        setVerifyEmail(decodeURIComponent(urlEmail));
        setVerifyToken(urlToken);
      }
    }
  }, [isOpen]);

  // Verify and fetch agent on mount or token change
  useEffect(() => {
    if (!token) {
      setAgent(null);
      return;
    }

    const fetchAgentProfile = async () => {
      try {
        const res = await fetch(apiUrl('/api/agent/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setAgent(json.data);
          } else {
            handleLogout();
          }
        } else {
          handleLogout();
        }
      } catch {
        handleLogout();
      }
    };

    fetchAgentProfile();
  }, [token]);

  // Fetch assigned deliveries
  const fetchAssignedOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/agent/orders'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setOrders(json.data);
          if (selectedOrder) {
            const updated = json.data.find((o: Order) => o.orderNumber === selectedOrder.orderNumber);
            if (updated) setSelectedOrder(updated);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load agent orders:', err);
    }
  };

  useEffect(() => {
    if (agent && token) {
      fetchAssignedOrders();
    }
  }, [agent, token]);

  if (!isOpen) return null;

  const handleLogout = () => {
    setToken(null);
    setAgent(null);
    localStorage.removeItem(AGENT_TOKEN_KEY);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(apiUrl('/api/agent/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem(AGENT_TOKEN_KEY, data.data.token);
        setToken(data.data.token);
        setAgent(data.data.agent);
        setSuccessMsg('Signed in successfully!');
      } else {
        setErrorMsg(data.message || 'Login failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl('/api/agent/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'agent.alex@shopsphere.test', password: 'Agent@123' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem(AGENT_TOKEN_KEY, data.data.token);
        setToken(data.data.token);
        setAgent(data.data.agent);
        setSuccessMsg('Logged in as verified demo delivery agent Alex Rivers!');
      } else {
        setErrorMsg(data.message || 'Demo login failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(apiUrl('/api/agent/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          gender: regGender,
          vehicleType: regVehicle,
          deliveryZone: regZone,
          avatarUrl: regAvatar,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyEmail(regEmail);
        if (data.data?.verificationToken) {
          setVerifyToken(data.data.verificationToken);
        }
        setAuthTab('verify');
        setSuccessMsg('Registration submitted! Enter your verification token below.');
      } else {
        setErrorMsg(data.message || 'Registration failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(apiUrl('/api/agent/verify-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, token: verifyToken }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedTempPassword(data.data?.tempPassword || null);
        setLoginEmail(verifyEmail);
        if (data.data?.tempPassword) {
          setLoginPassword(data.data.tempPassword);
        }
        setSuccessMsg('Email verified! Temporary password issued. You can now login.');
      } else {
        setErrorMsg(data.message || 'Verification failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setUpdatingPassword(true);
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl('/api/agent/profile/password'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAgent(data.data);
        setSuccessMsg('Permanent password saved successfully!');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(data.message || 'Password update failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleVerifyDeliveryOtp = async (orderId: string | number) => {
    if (!inputOtp || inputOtp.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit Delivery OTP');
      return;
    }

    setVerifyingOtp(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(apiUrl(`/api/agent/orders/${orderId}/verify-otp`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: inputOtp.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        setInputOtp('');
        await fetchAssignedOrders();
      } else {
        setErrorMsg(data.message || 'OTP verification failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCollectPaymentAndDeliver = async (orderId: string | number) => {
    setSettling(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(apiUrl(`/api/agent/orders/${orderId}/collect-payment`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethod: paymentMode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        await fetchAssignedOrders();
        // Refresh agent profile for latest totalEarnings
        const meRes = await fetch(apiUrl('/api/agent/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.data) setAgent(meData.data);
        }
      } else {
        setErrorMsg(data.message || 'Payment settlement failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSettling(false);
    }
  };

  // Generate UPI QR payment URL
  const generateUpiQrUrl = (order: Order) => {
    const upiString = `upi://pay?pa=shop.sphere@upi&pn=ShopSphere&am=${order.grandTotal.toFixed(2)}&tn=${order.orderNumber}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        data-test="delivery-agent-portal-modal"
        data-testid="delivery-agent-portal-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  ShopSphere Delivery Partner Portal
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Agent Console
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Email-Verified Onboarding, OTP Delivery Gate &amp; COD Cash / UPI QR Settlement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Unauthenticated Onboarding & Login Screen */}
        {!agent ? (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
            {/* Onboarding Mode Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                data-test="tab-agent-login"
                data-testid="tab-agent-login"
                onClick={() => setAuthTab('login')}
                className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  authTab === 'login'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>1. Agent Sign In</span>
              </button>
              <button
                type="button"
                data-test="tab-agent-register"
                data-testid="tab-agent-register"
                onClick={() => setAuthTab('register')}
                className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  authTab === 'register'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>2. Register Account</span>
              </button>
              <button
                type="button"
                data-test="tab-agent-verify"
                data-testid="tab-agent-verify"
                onClick={() => setAuthTab('verify')}
                className={`pb-3 px-4 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  authTab === 'verify'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>3. Verify Email &amp; Get Password</span>
              </button>
            </div>

            {/* TAB 1: LOGIN */}
            {authTab === 'login' && (
              <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Email-Verified Agent Portal</span>
                  </p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    New agents receive a temporary password in their email after completing verification.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Agent Email
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="agent.alex@shopsphere.test"
                    data-test="input-agent-login-email"
                    data-testid="input-agent-login-email"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Password (Temporary or Permanent)
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    data-test="input-agent-login-password"
                    data-testid="input-agent-login-password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  data-test="btn-agent-login"
                  data-testid="btn-agent-login"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Agent Portal'}
                </button>

                <div className="pt-3 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-500 mb-2">Quick Testing Shortcut:</p>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    data-test="btn-quick-demo-agent"
                    data-testid="btn-quick-demo-agent"
                    className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    ⚡ Quick Demo Login as Alex Rivers (Active Verified Agent)
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER */}
            {authTab === 'register' && (
              <form onSubmit={handleRegister} className="max-w-xl mx-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="e.g. Jordan Smith"
                      data-test="input-agent-reg-name"
                      data-testid="input-agent-reg-name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="jordan.delivery@example.com"
                      data-test="input-agent-reg-email"
                      data-testid="input-agent-reg-email"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone</label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      placeholder="+1 (555) 345-6789"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vehicle</label>
                    <select
                      value={regVehicle}
                      onChange={e => setRegVehicle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Bicycle">Bicycle / E-Bike</option>
                      <option value="Electric Scooter">Electric Scooter</option>
                      <option value="Car">Sedan / Hatchback</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delivery Zone</label>
                    <select
                      value={regZone}
                      onChange={e => setRegZone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="Central Hub">Central Hub</option>
                      <option value="North Zone">North Zone</option>
                      <option value="South Zone">South Zone</option>
                      <option value="Downtown">Downtown Express</option>
                    </select>
                  </div>
                </div>

                {/* Gender Selector with Dynamic Avatar Matching */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Gender (Any gender welcome — automatically matches preset avatars)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {[
                      { id: 'male', label: 'Male' },
                      { id: 'female', label: 'Female' },
                      { id: 'non_binary', label: 'Non-Binary' },
                      { id: 'prefer_not_to_say', label: 'Prefer Not to Say' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        data-test={`agent-reg-gender-${opt.id}`}
                        data-testid={`agent-reg-gender-${opt.id}`}
                        onClick={() => {
                          setRegGender(opt.id as Gender);
                          setRegAvatar(GENDER_PRESET_AVATARS[opt.id as Gender][0]);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          regGender === opt.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Matching Avatar Grid */}
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                    Select Avatar Preset for {regGender.replace(/_/g, ' ').toUpperCase()}:
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {GENDER_PRESET_AVATARS[regGender].map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        data-test={`reg-avatar-${idx}`}
                        data-testid={`reg-avatar-${idx}`}
                        onClick={() => setRegAvatar(url)}
                        className={`relative rounded-xl border-2 p-1 overflow-hidden transition-all cursor-pointer ${
                          regAvatar === url
                            ? 'border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50/50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <img src={url} alt="" className="w-full aspect-square rounded-lg object-cover" />
                        {regAvatar === url && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  data-test="btn-agent-register"
                  data-testid="btn-agent-register"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {loading ? 'Submitting Registration...' : 'Submit Application & Send Verification Token'}
                </button>
              </form>
            )}

            {/* TAB 3: VERIFY EMAIL */}
            {authTab === 'verify' && (
              <form onSubmit={handleVerifyEmail} className="max-w-md mx-auto space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-amber-600" />
                    <span>Check Your Registered Mailbox</span>
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Enter the 6-digit verification token sent via Brevo/SMTP. Once verified, a secure temporary login password will be generated for you.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Registered Agent Email
                  </label>
                  <input
                    type="email"
                    required
                    value={verifyEmail}
                    onChange={e => setVerifyEmail(e.target.value)}
                    placeholder="agent@example.com"
                    data-test="input-verify-email"
                    data-testid="input-verify-email"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    6-Digit Verification Token
                  </label>
                  <input
                    type="text"
                    required
                    value={verifyToken}
                    onChange={e => setVerifyToken(e.target.value)}
                    placeholder="123456"
                    data-test="input-verify-token"
                    data-testid="input-verify-token"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold tracking-widest text-center"
                  />
                </div>

                {issuedTempPassword && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-1">
                    <p className="text-xs font-bold text-emerald-900">Your Temporary Login Password:</p>
                    <p className="font-mono text-base font-extrabold text-emerald-700 bg-white p-2 rounded-lg border border-emerald-200 inline-block">
                      {issuedTempPassword}
                    </p>
                    <p className="text-[11px] text-emerald-600">
                      We have pre-filled this on the sign-in tab. Click below to login!
                    </p>
                    <button
                      type="button"
                      onClick={() => setAuthTab('login')}
                      className="mt-2 px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Go to Sign In
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  data-test="btn-verify-agent-email"
                  data-testid="btn-verify-agent-email"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Verify Email & Issue Temporary Password'}
                </button>
              </form>
            )}
          </div>
        ) : agent.mustChangePassword ? (
          /* Mandatory First-Login Password Change Prompt */
          <div className="p-6 max-w-md mx-auto my-auto space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Mandatory Security Update</h3>
              <p className="text-xs text-slate-500">
                You logged in with a temporary password. Please set your permanent delivery agent password to proceed to your dashboard.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  New Permanent Password (min. 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  data-test="input-new-permanent-password"
                  data-testid="input-new-permanent-password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Confirm Permanent Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  data-test="input-confirm-permanent-password"
                  data-testid="input-confirm-permanent-password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                data-test="btn-save-permanent-password"
                data-testid="btn-save-permanent-password"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {updatingPassword ? 'Saving Password...' : 'Save Permanent Password & Unlock Dashboard'}
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED AGENT DASHBOARD */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Agent Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={agent.avatarUrl}
                  alt={agent.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-600 shadow-sm ring-2 ring-indigo-100"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{agent.name}</span>
                    <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                      {agent.agentCode}
                    </span>
                    <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span>🏍️ {agent.vehicleType}</span>
                    <span>📍 {agent.deliveryZone}</span>
                    <span>💼 {agent.gender.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Wallet & Actions */}
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-right">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Wallet Earnings</div>
                  <div className="text-sm font-extrabold text-emerald-900 font-mono">
                    ${agent.totalEarnings.toFixed(2)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-xs"
                >
                  Profile
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dashboard Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-bold px-4 pt-2 bg-white">
              <button
                type="button"
                data-test="tab-active-deliveries"
                data-testid="tab-active-deliveries"
                onClick={() => setActiveTab('deliveries')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'deliveries'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Assigned Deliveries ({orders.length})</span>
              </button>
              <button
                type="button"
                data-test="tab-earnings-wallet"
                data-testid="tab-earnings-wallet"
                onClick={() => setActiveTab('earnings')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'earnings'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Earnings &amp; Payouts</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {activeTab === 'deliveries' && (
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-slate-600 text-sm">No assigned orders currently</p>
                      <p className="text-xs">New orders assigned to you by the auto-scheduler or admin will appear here.</p>
                      <button
                        type="button"
                        onClick={fetchAssignedOrders}
                        className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {orders.map(order => {
                        const isOutForDelivery = order.orderStatus === 'out_for_delivery';
                        const isDelivered = order.orderStatus === 'delivered';
                        const isCod = order.paymentMethod === 'cod';

                        return (
                          <div
                            key={order.id}
                            data-test={`agent-order-card-${order.orderNumber}`}
                            data-testid={`agent-order-card-${order.orderNumber}`}
                            className={`p-4 rounded-2xl border transition-all ${
                              isDelivered
                                ? 'bg-slate-50/70 border-slate-200 opacity-80'
                                : isOutForDelivery
                                ? 'bg-white border-indigo-300 shadow-md ring-2 ring-indigo-50'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono font-bold text-indigo-700 text-xs">
                                {order.orderNumber}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  isDelivered
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : isOutForDelivery
                                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                {order.orderStatus.replace(/_/g, ' ')}
                              </span>
                            </div>

                            {/* Customer & Location */}
                            <div className="space-y-1 text-xs text-slate-600 mb-3">
                              <p className="font-bold text-slate-900">{order.userName}</p>
                              <p className="flex items-start gap-1.5 text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span>
                                  {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
                                  {order.shippingAddress.state} {order.shippingAddress.postalCode}
                                </span>
                              </p>
                              {order.shippingAddress.phone && (
                                <p className="flex items-center gap-1.5 text-slate-500">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{order.shippingAddress.phone}</span>
                                </p>
                              )}
                            </div>

                            {/* Items & Payment Info */}
                            <div className="p-2.5 bg-slate-50 rounded-xl text-xs flex items-center justify-between mb-3">
                              <div>
                                <span className="font-bold text-slate-700">Amount Due:</span>
                                <span className="font-mono font-extrabold text-slate-900 ml-1 text-sm">
                                  ${order.grandTotal.toFixed(2)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    isCod ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isCod ? 'Cash on Delivery' : 'Prepaid (Card/UPI)'}
                                </span>
                              </div>
                            </div>

                            {/* SETTLEMENT ACTIONS FOR OUT FOR DELIVERY */}
                            {isOutForDelivery && (
                              <div className="pt-2 border-t border-slate-100 space-y-3">
                                {/* STEP 1: OTP Verification Gate */}
                                {!order.otpVerified ? (
                                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                      <span>Step 1: Enter Customer 6-Digit Delivery OTP</span>
                                    </div>
                                    <p className="text-[11px] text-indigo-700">
                                      Ask customer for the OTP sent to their email to unlock payment collection.
                                    </p>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="123456"
                                        value={inputOtp}
                                        onChange={e => setInputOtp(e.target.value)}
                                        data-test={`input-agent-otp-${order.orderNumber}`}
                                        data-testid={`input-agent-otp-${order.orderNumber}`}
                                        className="w-32 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-sm font-mono font-bold text-center tracking-widest"
                                      />
                                      <button
                                        type="button"
                                        disabled={verifyingOtp}
                                        onClick={() => handleVerifyDeliveryOtp(order.orderNumber)}
                                        data-test={`btn-verify-otp-${order.orderNumber}`}
                                        data-testid={`btn-verify-otp-${order.orderNumber}`}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                                      >
                                        {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* STEP 2: Payment Collection (Unlocked after OTP) */
                                  <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                                      <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span>Step 2: Collect Payment &amp; Settle</span>
                                      </span>
                                      <span className="px-2 py-0.2 rounded-full bg-emerald-200 text-emerald-800 text-[10px]">
                                        OTP Verified ✓
                                      </span>
                                    </div>

                                    {/* Mode Toggle: Cash vs UPI QR */}
                                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                                      <button
                                        type="button"
                                        onClick={() => setPaymentMode('cash')}
                                        data-test="btn-select-cash"
                                        data-testid="btn-select-cash"
                                        className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                                          paymentMode === 'cash'
                                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-200'
                                        }`}
                                      >
                                        💵 Cash Collected
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPaymentMode('upi')}
                                        data-test="btn-select-upi"
                                        data-testid="btn-select-upi"
                                        className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                                          paymentMode === 'upi'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                            : 'bg-white text-slate-700 border-slate-200'
                                        }`}
                                      >
                                        📱 Scannable UPI QR
                                      </button>
                                    </div>

                                    {/* Dynamic UPI QR Code */}
                                    {paymentMode === 'upi' && (
                                      <div className="p-3 bg-white rounded-xl border border-indigo-200 text-center space-y-2">
                                        <p className="text-[11px] font-bold text-indigo-900">
                                          Customer Scans Dynamic QR to Pay ${order.grandTotal.toFixed(2)}
                                        </p>
                                        <img
                                          src={generateUpiQrUrl(order)}
                                          alt="UPI QR Code"
                                          className="w-36 h-36 mx-auto border border-slate-200 rounded-lg p-1 bg-white"
                                        />
                                        <p className="font-mono text-[10px] text-slate-500">
                                          UPI ID: shop.sphere@upi | Ref: {order.orderNumber}
                                        </p>
                                      </div>
                                    )}

                                    {/* Final Settle Button */}
                                    <button
                                      type="button"
                                      disabled={settling}
                                      onClick={() => handleCollectPaymentAndDeliver(order.orderNumber)}
                                      data-test={`btn-settle-delivery-${order.orderNumber}`}
                                      data-testid={`btn-settle-delivery-${order.orderNumber}`}
                                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      {settling ? (
                                        'Settling...'
                                      ) : (
                                        <>
                                          <Check className="w-4 h-4" />
                                          <span>
                                            Confirm {paymentMode.toUpperCase()} Payment &amp; Mark Delivered (+$15.00)
                                          </span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {isDelivered && (
                              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-emerald-700 font-bold">
                                <span>✓ Delivered &amp; Commission Paid</span>
                                <span className="font-mono">+${(order.deliveryFee || 15).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* EARNINGS TAB */}
              {activeTab === 'earnings' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <div className="text-xs font-bold text-emerald-700 uppercase">Total Wallet Balance</div>
                      <div className="text-2xl font-black text-emerald-900 font-mono mt-1">
                        ${agent.totalEarnings.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-emerald-600 mt-1">Ready for weekly bank transfer</p>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
                      <div className="text-xs font-bold text-indigo-700 uppercase">Delivered Orders</div>
                      <div className="text-2xl font-black text-indigo-900 font-mono mt-1">
                        {agent.deliveredOrdersCount}
                      </div>
                      <p className="text-[11px] text-indigo-600 mt-1">Successfully fulfilled</p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
                      <div className="text-xs font-bold text-blue-700 uppercase">Per-Order Commission</div>
                      <div className="text-2xl font-black text-blue-900 font-mono mt-1">
                        ${agent.commissionRate.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-blue-600 mt-1">Guaranteed payout per order</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase mb-3">
                      Completed Deliveries History ({orders.filter(o => o.orderStatus === 'delivered').length})
                    </h4>
                    <div className="divide-y divide-slate-100 text-xs">
                      {orders
                        .filter(o => o.orderStatus === 'delivered')
                        .map(o => (
                          <div key={o.id} className="py-2.5 flex items-center justify-between">
                            <div>
                              <p className="font-mono font-bold text-indigo-700">{o.orderNumber}</p>
                              <p className="text-slate-500 text-[11px]">
                                {o.userName} • {o.shippingAddress.city}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-extrabold text-emerald-700">
                                +${(o.deliveryFee || 15).toFixed(2)}
                              </span>
                              <p className="text-[10px] text-slate-400">Credited to Wallet</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Shared Profile Settings Modal for Agent */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        agent={agent}
        onAgentUpdated={updated => setAgent(updated)}
      />
    </div>
  );
};
