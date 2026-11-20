import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
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
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api.js';
import { AppNotification, DeliveryAgent, Gender, Order } from '../types.js';
import { LiveRouteMap } from './LiveRouteMap.js';
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
  const [regPhone, setRegPhone] = useState('+91 98765 43210');
  const [regGender, setRegGender] = useState<Gender>('male');
  const [regVehicle, setRegVehicle] = useState('Motorcycle');
  const [regZone, setRegZone] = useState('Hitech City, Hyderabad');
  const [regAvatar, setRegAvatar] = useState(GENDER_PRESET_AVATARS.male[0]);

  // Verification form
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

  // Mandatory / voluntary password update
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Portal dashboard
  const [activeTab, setActiveTab] = useState<'deliveries' | 'earnings' | 'store-deposit'>('deliveries');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // In-App Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // Settlement action states
  const [inputOtp, setInputOtp] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

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
      if (urlEmail) {
        setAuthTab('verify');
        setVerifyEmail(decodeURIComponent(urlEmail));
        setVerifyToken(''); // Never auto-populate verification OTP from URL
      }
    }
  }, [isOpen]);

  // Verify and fetch agent on mount or token change
  useEffect(() => {
    if (!token) {
      setAgent(null);
      return;
    }
    fetchAgentProfile();
  }, [token]);

  const fetchAgentProfile = async () => {
    if (!token) return;
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

  // Fetch agent alerts & notifications
  const fetchAgentNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/agent/notifications'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setNotifications(json.data.notifications || []);
          setUnreadNotifs(json.data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error('[Agent Notifs Fetch Error]:', err);
    }
  };

  const handleMarkAgentNotifRead = async (id: number | string) => {
    if (!token) return;
    try {
      await fetch(apiUrl(`/api/agent/notifications/${id}/read`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadNotifs(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleMarkAllAgentNotifsRead = async () => {
    if (!token) return;
    try {
      await fetch(apiUrl('/api/agent/notifications/mark-all-read'), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifs(0);
    } catch (err) {
      console.error('Failed to mark all alerts as read:', err);
    }
  };

  // Agent submits cash deposited at Hyderabad store counter
  const handleSubmitStoreDeposit = async () => {
    if (!token) return;
    setSubmittingDeposit(true);
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl('/api/agent/cash-deposit/submit'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Cash deposit submitted! Store Admin has been alerted to confirm receipt and unlock your account.');
        await Promise.all([fetchAgentProfile(), fetchAssignedOrders(), fetchAgentNotifications()]);
      } else {
        setErrorMsg(data.message || 'Failed to submit cash deposit');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setSubmittingDeposit(false);
    }
  };

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
      fetchAgentNotifications();
    }
  }, [agent, token]);

  // Periodic heartbeat every 60s when logged in
  useEffect(() => {
    if (!token || !agent) return;
    const interval = setInterval(async () => {
      try {
        await fetch(apiUrl('/api/agent/heartbeat'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currentLat: 17.4486, currentLng: 78.3908 }),
        });
      } catch (e) {
        // Heartbeat error ignored
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [token, agent]);

  // Real-time polling every 6s for FIFO orders, deposit status approvals, and notifications
  useEffect(() => {
    if (!token || !agent) return;
    const syncInterval = setInterval(() => {
      fetchAssignedOrders();
      fetchAgentProfile();
      fetchAgentNotifications();
    }, 6000);
    return () => clearInterval(syncInterval);
  }, [token, agent]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch(apiUrl('/api/agent/logout'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // Ignore logout error
      }
    }
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
        setSuccessMsg('Signed in successfully! Joined active Hyderabad FIFO queue.');
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
        setSuccessMsg('Logged in as verified Hyderabad delivery partner Alex Rivers!');
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
        setVerifyToken(''); // Never auto-populate OTP in the verification box!
        setAuthTab('verify');
        setSuccessMsg('Registration submitted! A 6-digit verification code (OTP) has been sent to your registered email address. Please check your mailbox and enter it below.');
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
    if (!verifyToken.trim()) {
      setErrorMsg('Please enter the 6-digit verification code sent to your email');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(apiUrl('/api/agent/verify-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, token: verifyToken.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyToken('');
        setLoginEmail(verifyEmail);
        setLoginPassword(''); // Clean empty password field! Never pre-fill temporary password.
        setAuthTab('login');
        setSuccessMsg('Email verified successfully! A secure temporary login password has been sent to your registered email address. Please check your inbox, sign in with your temporary password, and you will be asked to set a new permanent password.');
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

  // FIFO Accept Assignment
  const handleAcceptAssignment = async (orderId: string | number) => {
    setActionLoading(prev => ({ ...prev, [`accept-${orderId}`]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/agent/orders/${orderId}/accept`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Order accepted! Status changed to OUT FOR DELIVERY. Delivery OTP dispatched to customer.');
        await fetchAssignedOrders();
      } else {
        setErrorMsg(data.message || 'Failed to accept assignment');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`accept-${orderId}`]: false }));
    }
  };

  // FIFO Reject Assignment
  const handleRejectAssignment = async (orderId: string | number) => {
    setActionLoading(prev => ({ ...prev, [`reject-${orderId}`]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/agent/orders/${orderId}/reject`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Assignment rejected. Reassigned to next available FIFO agent.');
        await fetchAssignedOrders();
      } else {
        setErrorMsg(data.message || 'Failed to reject assignment');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`reject-${orderId}`]: false }));
    }
  };

  // Universal OTP verification
  const handleVerifyDeliveryOtp = async (orderId: string | number) => {
    const code = inputOtp[orderId];
    if (!code || code.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit Delivery OTP');
      return;
    }

    setActionLoading(prev => ({ ...prev, [`otp-${orderId}`]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/agent/orders/${orderId}/verify-otp`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: code.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'OTP verified successfully! You may now complete delivery or collect payment.');
        setInputOtp(prev => ({ ...prev, [orderId]: '' }));
        await fetchAssignedOrders();
      } else {
        setErrorMsg(data.message || 'OTP verification failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`otp-${orderId}`]: false }));
    }
  };

  // Complete prepaid delivery
  const handleCompletePrepaidDelivery = async (orderId: string | number) => {
    setActionLoading(prev => ({ ...prev, [`prepaid-${orderId}`]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/agent/orders/${orderId}/complete-delivery`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Prepaid delivery successfully completed! Commission credited to your wallet.');
        await fetchAssignedOrders();
        refreshMe();
      } else {
        setErrorMsg(data.message || 'Failed to complete delivery');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`prepaid-${orderId}`]: false }));
    }
  };

  // Submit UPI QR payment
  const handleCodQrPaid = async (orderId: string | number) => {
    setActionLoading(prev => ({ ...prev, [`qr-${orderId}`]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/agent/orders/${orderId}/cod-qr-submitted`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('UPI QR payment recorded! Order marked DELIVERED, awaiting Admin QR verification.');
        await fetchAssignedOrders();
        refreshMe();
      } else {
        setErrorMsg(data.message || 'Failed to record QR payment');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`qr-${orderId}`]: false }));
    }
  };

  // Collect physical Cash (Locks agent)
  const handleCodCashCollected = async (orderId: string | number) => {
    if (
      !window.confirm(
        'Warning: Collecting physical cash will LOCK your account from new delivery assignments until you deposit the amount at the Hyderabad Store. Proceed?'
      )
    ) {
      return;
    }
    setActionLoading(prev => ({ ...prev, [`cash-${orderId}`]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/agent/orders/${orderId}/cod-cash-collected`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Cash collected! Account is now LOCKED until physical deposit at Hyderabad Flagship Store.');
        await fetchAssignedOrders();
        refreshMe();
      } else {
        setErrorMsg(data.message || 'Failed to record cash collection');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`cash-${orderId}`]: false }));
    }
  };

  // Mark cash deposited at store
  const handleMarkCashDeposited = async (orderId: string | number) => {
    setActionLoading(prev => ({ ...prev, [`deposit-${orderId}`]: true }));
    setErrorMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/agent/orders/${orderId}/mark-cash-deposited`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Cash deposit submitted! Awaiting Store Admin confirmation to unlock your account.');
        await fetchAssignedOrders();
        refreshMe();
      } else {
        setErrorMsg(data.message || 'Failed to submit deposit');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`deposit-${orderId}`]: false }));
    }
  };

  const refreshMe = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/agent/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) setAgent(json.data);
      }
    } catch (e) {
      // Ignore
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
                  ShopSphere Delivery Partner Portal 🇮🇳
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Hyderabad Hub
                </span>
              </div>
              <p className="text-xs text-slate-400">
                FIFO Queue Auto-Assignment, Masked Logistics, OTP Gates &amp; Hyderabad Store Settlements
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
                    <span>Email-Verified Agent Portal (Hyderabad Hub)</span>
                  </p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Logging in activates your online presence and places you in the active FIFO assignment rotation.
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
                  {loading ? 'Authenticating & Joining Queue...' : 'Sign In to Agent Portal'}
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
                      placeholder="e.g. Ramesh Reddy"
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
                      placeholder="ramesh.reddy@example.com"
                      data-test="input-agent-reg-email"
                      data-testid="input-agent-reg-email"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone (+91 🇮🇳)</label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      placeholder="+91 98765 43210"
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
                      <option value="Electric Scooter">Electric Scooter</option>
                      <option value="Bicycle">Bicycle / E-Bike</option>
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
                      <option value="Hitech City, Hyderabad">Hitech City, Hyderabad</option>
                      <option value="Madhapur, Hyderabad">Madhapur, Hyderabad</option>
                      <option value="Gachibowli, Hyderabad">Gachibowli, Hyderabad</option>
                      <option value="Jubilee Hills, Hyderabad">Jubilee Hills, Hyderabad</option>
                      <option value="Banjara Hills, Hyderabad">Banjara Hills, Hyderabad</option>
                      <option value="Kukatpally, Hyderabad">Kukatpally, Hyderabad</option>
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
                    Enter the 6-digit verification code (OTP) sent to your registered email address. Once verified, your temporary login password will be delivered directly to your mailbox (not shown in the UI).
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
                    6-Digit Verification Code (OTP)
                  </label>
                  <input
                    type="text"
                    required
                    value={verifyToken}
                    onChange={e => setVerifyToken(e.target.value)}
                    placeholder="Enter 6-digit OTP from email"
                    data-test="input-verify-token"
                    data-testid="input-verify-token"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold tracking-widest text-center"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  data-test="btn-verify-agent-email"
                  data-testid="btn-verify-agent-email"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {loading ? 'Verifying...' : 'Verify Email & Send Temporary Password'}
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
            {/* Cash Deposit Lock Alert Banner */}
            {agent.hasPendingCashDeposit && (
              <div className={`p-3 font-bold text-xs flex items-center justify-between gap-2 shadow-inner ${
                agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED'
                  ? 'bg-rose-500 text-white'
                  : agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-500 text-slate-950'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>
                    {agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED' ? (
                      <>❌ <strong>DEPOSIT REJECTED:</strong> {agent.depositRejectionReason || 'Cash mismatch'}. Please deposit ₹{(agent.pendingCashAmount || 0).toFixed(2)} at store counter and resubmit.</>
                    ) : agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL' ? (
                      <>⏳ <strong>DEPOSIT SUBMITTED:</strong> ₹{(agent.pendingCashAmount || 0).toFixed(2)} awaiting Store Admin verification. Your account will automatically unlock once approved.</>
                    ) : (
                      <>🔒 <strong>ACCOUNT LOCKED:</strong> ₹{(agent.pendingCashAmount || 0).toFixed(2)} cash pending deposit at Hyderabad Store. New delivery assignments are paused until Store Admin confirms your cash deposit.</>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('store-deposit')}
                  className="font-mono text-[10px] px-2.5 py-1 rounded bg-slate-950 text-white hover:bg-slate-800 font-extrabold uppercase shrink-0 cursor-pointer"
                >
                  View Deposit
                </button>
              </div>
            )}

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
                      🟢 Online (FIFO Rank #{agent.fifoRank || 1})
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
                    ₹{agent.totalEarnings.toFixed(2)}
                  </div>
                </div>

                {/* Agent In-App Notification Bell */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    title="Alerts & Notifications"
                    className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifs > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {unreadNotifs > 9 ? '9+' : unreadNotifs}
                      </span>
                    )}
                  </button>

                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-indigo-600" />
                          Alerts ({unreadNotifs} unread)
                        </span>
                        {unreadNotifs > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllAgentNotifsRead}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-400">No alerts yet</div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => !n.isRead && handleMarkAgentNotifRead(n.id)}
                              className={`p-3 transition-colors cursor-pointer ${
                                n.isRead ? 'bg-white text-slate-500' : 'bg-indigo-50/50 text-slate-800'
                              } hover:bg-slate-50`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-slate-900">{n.title}</span>
                                {n.amount && (
                                  <span className="font-mono text-emerald-700 font-bold text-[11px]">
                                    ₹{Number(n.amount).toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {!n.isRead && <span className="text-rose-500 font-bold">● New</span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
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
              <button
                type="button"
                data-test="tab-store-deposit"
                data-testid="tab-store-deposit"
                onClick={() => setActiveTab('store-deposit')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'store-deposit'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Store Cash Deposit</span>
                {agent.hasPendingCashDeposit && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    🔒 Locked
                  </span>
                )}
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
                      <p className="text-xs">
                        When orders transition to PROCESSED, the FIFO auto-dispatcher assigns them to you in turn.
                      </p>
                      <button
                        type="button"
                        onClick={fetchAssignedOrders}
                        className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {orders.map(order => {
                        const isPendingAcceptance = order.assignmentStatus === 'PENDING_ACCEPTANCE';
                        const isOutForDelivery = order.orderStatus === 'out_for_delivery';
                        const isDelivered = order.orderStatus === 'delivered';
                        const isCod = order.paymentMode === 'COD' || order.paymentMethod === 'cod';

                        return (
                          <div
                            key={order.id}
                            data-test={`agent-order-card-${order.orderNumber}`}
                            data-testid={`agent-order-card-${order.orderNumber}`}
                            className={`p-4 rounded-2xl border transition-all ${
                              isDelivered
                                ? 'bg-slate-50/70 border-slate-200 opacity-80'
                                : isPendingAcceptance
                                ? 'bg-amber-50/60 border-amber-300 shadow-md ring-2 ring-amber-200'
                                : isOutForDelivery
                                ? 'bg-white border-indigo-300 shadow-md ring-2 ring-indigo-50'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono font-bold text-indigo-700 text-xs">
                                {order.orderNumber}
                              </span>
                              <div className="flex items-center gap-2">
                                {isPendingAcceptance && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 animate-pulse">
                                    <Clock className="w-3 h-3" />
                                    <span>PENDING ACCEPTANCE (3-Min Window)</span>
                                  </span>
                                )}
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
                            </div>

                            {/* 3-Minute Acceptance Alert Bar */}
                            {isPendingAcceptance && (
                              <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-amber-800" />
                                    <span>New Delivery Assignment Offered</span>
                                  </p>
                                  <p className="text-[11px] text-amber-800 mt-0.5">
                                    Please accept or reject within 3 minutes. Accepting will move order to OUT FOR DELIVERY and notify customer.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={actionLoading[`accept-${order.orderNumber}`]}
                                    onClick={() => handleAcceptAssignment(order.orderNumber)}
                                    data-test={`btn-accept-${order.orderNumber}`}
                                    data-testid={`btn-accept-${order.orderNumber}`}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                                  >
                                    {actionLoading[`accept-${order.orderNumber}`] ? 'Accepting...' : '✓ Accept Order'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actionLoading[`reject-${order.orderNumber}`]}
                                    onClick={() => handleRejectAssignment(order.orderNumber)}
                                    data-test={`btn-reject-${order.orderNumber}`}
                                    data-testid={`btn-reject-${order.orderNumber}`}
                                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                                  >
                                    {actionLoading[`reject-${order.orderNumber}`] ? 'Rejecting...' : '✕ Reject'}
                                  </button>
                                </div>
                              </div>
                            )}

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

                            {/* Privacy-Masked Package Details */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                                <span className="flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                  <span>Package Items (Privacy-Masked Logistics View)</span>
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase font-mono">
                                  {order.items.length} Product SKU(s)
                                </span>
                              </div>
                              <div className="divide-y divide-slate-200/60 text-xs">
                                {order.items.map((it, idx) => (
                                  <div key={idx} className="py-1.5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        📦 SKU #{it.productCode || it.productId || it.id}
                                      </span>
                                      <span className="text-slate-500">Qty: {it.quantity}</span>
                                    </div>
                                    <span className="font-mono font-bold text-slate-800">
                                      ₹{it.totalPrice.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Amount Due & Payment Mode */}
                            <div className="p-2.5 bg-slate-100 rounded-xl text-xs flex items-center justify-between mb-3">
                              <div>
                                <span className="font-bold text-slate-700">Total Amount:</span>
                                <span className="font-mono font-extrabold text-slate-900 ml-1 text-sm">
                                  ₹{order.grandTotal.toFixed(2)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    isCod ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isCod ? 'Cash on Delivery (COD)' : 'Prepaid (Card/Online)'}
                                </span>
                              </div>
                            </div>

                            {/* Live Map for In-Transit Orders */}
                            {isOutForDelivery && (
                              <div className="mb-3">
                                <LiveRouteMap
                                  destinationLat={order.deliveryLat || 17.4375}
                                  destinationLng={order.deliveryLng || 78.4482}
                                  customerAddress={`${order.shippingAddress.street}, ${order.shippingAddress.city}`}
                                  orderStatus={order.orderStatus}
                                  assignedAgentName={order.assignedAgentName || agent.name}
                                  assignedAgentPhone={order.assignedAgentPhone || agent.phone}
                                />
                              </div>
                            )}

                            {/* UNIVERSAL OTP & SETTLEMENT GATE */}
                            {isOutForDelivery && (
                              <div className="pt-2 border-t border-slate-100 space-y-3">
                                {/* STEP 1: Universal OTP Verification Gate */}
                                {!order.otpVerified ? (
                                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                      <span>Universal Delivery Gate: Enter Customer 6-Digit Delivery OTP</span>
                                    </div>
                                    <p className="text-[11px] text-indigo-700">
                                      Customer was sent their 6-digit OTP via email and customer app when order moved to OUT FOR DELIVERY.
                                    </p>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="123456"
                                        value={inputOtp[order.orderNumber] || ''}
                                        onChange={e =>
                                          setInputOtp(prev => ({ ...prev, [order.orderNumber]: e.target.value }))
                                        }
                                        data-test={`input-agent-otp-${order.orderNumber}`}
                                        data-testid={`input-agent-otp-${order.orderNumber}`}
                                        className="w-32 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-sm font-mono font-bold text-center tracking-widest"
                                      />
                                      <button
                                        type="button"
                                        disabled={actionLoading[`otp-${order.orderNumber}`]}
                                        onClick={() => handleVerifyDeliveryOtp(order.orderNumber)}
                                        data-test={`btn-verify-otp-${order.orderNumber}`}
                                        data-testid={`btn-verify-otp-${order.orderNumber}`}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                                      >
                                        {actionLoading[`otp-${order.orderNumber}`] ? 'Verifying...' : 'Verify OTP'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* STEP 2: Delivery Completion / Settlement (Unlocked after OTP) */
                                  <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                                      <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span>Delivery Verification Complete (OTP Verified ✓)</span>
                                      </span>
                                    </div>

                                    {/* PREPAID COMPLETION */}
                                    {!isCod ? (
                                      <button
                                        type="button"
                                        disabled={actionLoading[`prepaid-${order.orderNumber}`]}
                                        onClick={() => handleCompletePrepaidDelivery(order.orderNumber)}
                                        data-test={`btn-complete-prepaid-${order.orderNumber}`}
                                        data-testid={`btn-complete-prepaid-${order.orderNumber}`}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                                      >
                                        {actionLoading[`prepaid-${order.orderNumber}`] ? (
                                          'Completing Delivery...'
                                        ) : (
                                          <>
                                            <Check className="w-4 h-4" />
                                            <span>Complete Prepaid Delivery &amp; Credit ₹150 Commission</span>
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      /* COD PAYMENT OPTIONS */
                                      <div className="space-y-3">
                                        <p className="text-[11px] text-slate-600 font-semibold">
                                          Select customer COD payment method:
                                        </p>

                                        {/* Option A: Scannable UPI QR */}
                                        <div className="p-3 bg-white rounded-xl border border-indigo-200 text-center space-y-2">
                                          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-900">
                                            <QrCode className="w-4 h-4 text-indigo-600" />
                                            <span>Dynamic UPI QR Code (₹{order.grandTotal.toFixed(2)})</span>
                                          </div>
                                          <img
                                            src={generateUpiQrUrl(order)}
                                            alt="UPI QR Code"
                                            className="w-36 h-36 mx-auto border border-slate-200 rounded-lg p-1 bg-white"
                                          />
                                          <p className="font-mono text-[10px] text-slate-500">
                                            UPI ID: shop.sphere@upi | Ref: {order.orderNumber}
                                          </p>
                                          <button
                                            type="button"
                                            disabled={actionLoading[`qr-${order.orderNumber}`]}
                                            onClick={() => handleCodQrPaid(order.orderNumber)}
                                            data-test={`btn-qr-paid-${order.orderNumber}`}
                                            data-testid={`btn-qr-paid-${order.orderNumber}`}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                                          >
                                            {actionLoading[`qr-${order.orderNumber}`]
                                              ? 'Submitting...'
                                              : '✓ Customer Paid via UPI QR (Awaiting Store Admin)'}
                                          </button>
                                        </div>

                                        {/* Option B: Physical Cash (Locks Agent) */}
                                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-2">
                                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                                            <Banknote className="w-4 h-4 text-amber-700" />
                                            <span>Collect Physical Cash (₹{order.grandTotal.toFixed(2)})</span>
                                          </div>
                                          <p className="text-[11px] text-amber-800">
                                            ⚠️ <strong>Lockout Notice:</strong> Collecting physical cash will lock your account from new deliveries until the cash is physically deposited at the Hyderabad Flagship Store.
                                          </p>
                                          <button
                                            type="button"
                                            disabled={actionLoading[`cash-${order.orderNumber}`]}
                                            onClick={() => handleCodCashCollected(order.orderNumber)}
                                            data-test={`btn-cash-collected-${order.orderNumber}`}
                                            data-testid={`btn-cash-collected-${order.orderNumber}`}
                                            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                                          >
                                            {actionLoading[`cash-${order.orderNumber}`]
                                              ? 'Recording Collection...'
                                              : '💵 Collect Cash & Lock Account for Store Deposit'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* CASH DEPOSIT REQUESTED STEP FOR AGENT */}
                            {order.paymentSettlementStatus === 'CASH_DEPOSIT_REQUESTED' && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-300 rounded-xl space-y-2">
                                <p className="text-xs font-bold text-blue-950">
                                  🏦 Store Cash Deposit Requested: ₹{order.grandTotal.toFixed(2)}
                                </p>
                                <p className="text-[11px] text-blue-800">
                                  Deposit this physical cash at the Hyderabad Flagship Store counter (Hitech City / Madhapur). Click below once deposited.
                                </p>
                                <button
                                  type="button"
                                  disabled={actionLoading[`deposit-${order.orderNumber}`]}
                                  onClick={() => handleMarkCashDeposited(order.orderNumber)}
                                  data-test={`btn-mark-cash-deposited-${order.orderNumber}`}
                                  data-testid={`btn-mark-cash-deposited-${order.orderNumber}`}
                                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                                >
                                  {actionLoading[`deposit-${order.orderNumber}`]
                                    ? 'Updating...'
                                    : '✓ Mark Cash Deposited at Store'}
                                </button>
                              </div>
                            )}

                            {isDelivered && (
                              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-emerald-700 font-bold">
                                <span>✓ Delivered &amp; Commission Credited</span>
                                <span className="font-mono">+₹{(order.deliveryFee || 150).toFixed(2)}</span>
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
                        ₹{agent.totalEarnings.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-emerald-600 mt-1">Ready for weekly bank transfer (+91 UPI)</p>
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
                        ₹{(agent.commissionRate || 150).toFixed(2)}
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
                                +₹{(o.deliveryFee || 150).toFixed(2)}
                              </span>
                              <p className="text-[10px] text-slate-400">Credited to Wallet</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STORE CASH DEPOSIT TAB */}
              {activeTab === 'store-deposit' && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl border ${
                    agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED'
                      ? 'bg-rose-50 border-rose-300'
                      : agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                      ? 'bg-amber-50 border-amber-300'
                      : agent.hasPendingCashDeposit
                      ? 'bg-amber-50/70 border-amber-300'
                      : 'bg-emerald-50 border-emerald-300'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Banknote className={`w-5 h-5 ${
                            agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED'
                              ? 'text-rose-600'
                              : agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                              ? 'text-amber-600'
                              : agent.hasPendingCashDeposit
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`} />
                          <h4 className="font-extrabold text-slate-900 text-sm">
                            {agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED'
                              ? 'Deposit Rejected by Store Admin'
                              : agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                              ? 'Deposit Submitted — Awaiting Store Admin Approval'
                              : agent.hasPendingCashDeposit
                              ? 'Cash Store-Deposit Required (Account Locked)'
                              : 'Account Unlocked & Ready for Orders'}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          {agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED' ? (
                            <>
                              <strong>Rejection Reason:</strong> {agent.depositRejectionReason || 'Cash mismatch'}. Please visit the Hyderabad Flagship Store counter to rectify and resubmit confirmation.
                            </>
                          ) : agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL' ? (
                            <>
                              Your cash deposit confirmation of ₹{(agent.pendingCashAmount || 0).toFixed(2)} has been submitted. The store counter admin will verify the physical cash and unlock your account.
                            </>
                          ) : agent.hasPendingCashDeposit ? (
                            <>
                              You are holding ₹{(agent.pendingCashAmount || 0).toFixed(2)} from physical Cash on Delivery orders. Hand over this cash at the Hyderabad Flagship Store counter to unlock your account into the active FIFO queue.
                            </>
                          ) : (
                            <>
                              You have ₹0 pending cash deposits. Your account is online and eligible to receive new delivery assignments.
                            </>
                          )}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Cash Balance</div>
                        <div className={`font-mono text-xl font-extrabold ${
                          agent.hasPendingCashDeposit ? 'text-rose-700' : 'text-emerald-700'
                        }`}>
                          ₹{(agent.pendingCashAmount || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {agent.hasPendingCashDeposit && (
                      <div className="mt-4 pt-3 border-t border-slate-200/80">
                        {agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL' ? (
                          <div className="p-2.5 bg-amber-100/80 rounded-xl text-center text-xs font-bold text-amber-950 flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                            <span>Submitted to Store Counter. Waiting for Admin verification...</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={submittingDeposit}
                            onClick={handleSubmitStoreDeposit}
                            className={`w-full py-2.5 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 ${
                              agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED'
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {submittingDeposit
                                ? 'Submitting Confirmation...'
                                : agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED'
                                ? 'Re-submit Store Cash Deposit Confirmation'
                                : 'Mark Cash Deposited at Store (Submit for Approval)'}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hyderabad Store Details Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span>ShopSphere Hyderabad Flagship Store &amp; Dispatch Hub</span>
                    </div>
                    <p className="text-slate-600">
                      Address: Plot 42, Hitech City Main Rd, Madhapur, Hyderabad, Telangana 500081<br />
                      Counter Hours: 08:00 AM – 10:00 PM IST | Cashier Desk: Counter #3 (Logistics Settlement)
                    </p>
                  </div>

                  {/* Breakdown of Linked COD Cash Orders */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs uppercase mb-3">
                      Cash on Delivery Orders in Hand ({orders.filter(o => o.codPaymentMethod === 'cash' || o.paymentMethod === 'cod').length})
                    </h4>
                    {orders.filter(o => o.codPaymentMethod === 'cash' || o.paymentMethod === 'cod').length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No COD cash orders recorded</p>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs">
                        {orders
                          .filter(o => o.codPaymentMethod === 'cash' || o.paymentMethod === 'cod')
                          .map(o => (
                            <div key={o.id} className="py-2.5 flex items-center justify-between">
                              <div>
                                <p className="font-mono font-bold text-slate-900">#{o.orderNumber}</p>
                                <p className="text-slate-500 text-[11px]">{o.userName} • {o.shippingAddress.city}</p>
                                <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.2 rounded-full font-bold ${
                                  o.paymentSettlementStatus === 'CASH_DEPOSITED_AT_STORE' || o.paymentSettlementStatus === 'SETTLED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : o.paymentSettlementStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {o.paymentSettlementStatus || 'CASH_COLLECTED'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-extrabold text-slate-900">
                                  ₹{Number(o.grandTotal).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
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
