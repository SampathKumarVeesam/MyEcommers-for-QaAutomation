import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
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
  TrendingUp,
  Truck,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api.js';
import { AppNotification, DeliveryAgent, Gender, Order } from '../types.js';
import { LiveOrderMap } from './LiveOrderMap.js';
import { DeliveryEtaCountdown } from './DeliveryEtaCountdown.js';
import { EmergencyTransferModal } from './EmergencyTransferModal.js';
import { GENDER_PRESET_AVATARS, ProfileModal } from './ProfileModal.js';
import { resolveAddressCoordinates } from '../config/hyderabadCoordinates.js';
import { AgentAnalyticsHub } from './analytics/AgentAnalyticsHub.js';
import { AuthGlassLayout } from './auth/AuthGlassLayout.js';

interface DeliveryAgentPortalProps {
  isOpen: boolean;
  onClose: () => void;
  isModal?: boolean;
}

const AGENT_TOKEN_KEY = 'shopsphere_agent_token';

export const DeliveryAgentPortal: React.FC<DeliveryAgentPortalProps> = ({ isOpen, onClose, isModal = true }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AGENT_TOKEN_KEY) || null);
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 3-Step Agent Password Reset State Machine ('email' -> 'otp' -> 'new_password')
  const [agentResetStep, setAgentResetStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [agentOtpVerifyLoading, setAgentOtpVerifyLoading] = useState(false);
  const [agentOtpVerified, setAgentOtpVerified] = useState(false);

  // Agent Forgot Password state
  const [agentForgotEmail, setAgentForgotEmail] = useState('');

  // Agent Reset Password state
  const [agentResetEmail, setAgentResetEmail] = useState('');
  const [agentResetOtp, setAgentResetOtp] = useState('');
  const [agentResetToken, setAgentResetToken] = useState('');
  const [agentResetPassword, setAgentResetPassword] = useState('');
  const [agentResetConfirmPassword, setAgentResetConfirmPassword] = useState('');

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

  // Portal dashboard (Defaults to Image 7 Assigned Deliveries)
  const [activeTab, setActiveTab] = useState<'analytics' | 'deliveries' | 'earnings' | 'store-deposit'>('deliveries');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [transferringOrder, setTransferringOrder] = useState<Order | null>(null);

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
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const queryStr = search ? search.slice(1) : (hash.includes('?') ? hash.split('?')[1] : '');
      const searchParams = new URLSearchParams(queryStr);
      const urlEmail = searchParams.get('verifyEmail') || searchParams.get('email');
      const action = searchParams.get('action');
      const tokenParam = searchParams.get('token');

      if (action === 'reset-password' || hash.includes('reset-password')) {
        setAuthTab('reset');
        setAgentResetStep('new_password');
        if (urlEmail) setAgentResetEmail(decodeURIComponent(urlEmail));
        if (tokenParam) setAgentResetToken(tokenParam);
      } else if (action === 'forgot-password') {
        setAuthTab('forgot');
        setAgentResetStep('email');
        if (urlEmail) setAgentForgotEmail(decodeURIComponent(urlEmail));
      } else if (urlEmail && searchParams.get('verifyEmail')) {
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

  const handleQuickDemoLogin = async (targetEmail = 'agent.uday@shopsphere.test') => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let res = await fetch(apiUrl('/api/agent/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: 'Agent@123' }),
      });
      let data = await res.json();
      if (!res.ok || !data.success) {
        // Fallback to alex if uday is not seeded yet on remote
        res = await fetch(apiUrl('/api/agent/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'agent.alex@shopsphere.test', password: 'Agent@123' }),
        });
        data = await res.json();
      }
      if (res.ok && data.success) {
        localStorage.setItem(AGENT_TOKEN_KEY, data.data.token);
        setToken(data.data.token);
        setAgent(data.data.agent);
        setSuccessMsg(`Logged in as verified Hyderabad delivery partner ${data.data.agent.name}!`);
      } else {
        setErrorMsg(data.message || 'Demo login failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleAgentForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetEmail = (agentForgotEmail || agentResetEmail).trim();
    if (!targetEmail) {
      setErrorMsg('Please enter your registered agent email address');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/agent/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'A 6-digit password reset OTP and reset link have been sent to your email address.');
        setAgentResetEmail(targetEmail);
        setAgentForgotEmail(targetEmail);
        setAgentResetStep('otp');
      } else {
        setErrorMsg(data.message || 'Failed to request agent password reset');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAgentVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAgentOtpVerifyLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetEmail = (agentResetEmail || agentForgotEmail).trim();
    if (!targetEmail) {
      setErrorMsg('Registered agent email address is required');
      setAgentOtpVerifyLoading(false);
      return;
    }
    if (!agentResetOtp || agentResetOtp.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification OTP');
      setAgentOtpVerifyLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/agent/verify-reset-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, otp: agentResetOtp.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAgentOtpVerified(true);
        if (data.resetToken) setAgentResetToken(data.resetToken);
        setSuccessMsg('Email OTP Verified ✓');
        setAgentResetStep('new_password');
      } else {
        setErrorMsg(data.message || 'Invalid verification OTP. Please check and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error verifying OTP. Please try again.');
    } finally {
      setAgentOtpVerifyLoading(false);
    }
  };

  const handleAgentResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetEmail = (agentResetEmail || agentForgotEmail).trim();
    if (!targetEmail) {
      setErrorMsg('Registered agent email address is required');
      setLoading(false);
      return;
    }
    if (!agentResetOtp.trim() && !agentResetToken.trim()) {
      setErrorMsg('Please enter the 6-digit OTP code received in your email');
      setLoading(false);
      return;
    }
    if (!agentResetPassword || agentResetPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    if (agentResetPassword !== agentResetConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/agent/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          otp: agentResetOtp.trim(),
          token: agentResetToken.trim() || undefined,
          newPassword: agentResetPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Password reset successfully! You can now log in.');
        setTimeout(() => {
          setLoginEmail(targetEmail);
          setAuthTab('login');
          setAgentResetStep('email');
          setAgentResetOtp('');
          setAgentResetPassword('');
          setAgentResetConfirmPassword('');
          setSuccessMsg(null);
        }, 1500);
      } else {
        setErrorMsg(data.message || 'Password reset failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred. Please try again.');
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

  const handleToggleDuty = async (nextStatus: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/agent/status'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) setAgent(json.data);
      }
    } catch {
      // Ignore
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

  // 1. Unauthenticated Delivery Agent Sign In / Register Pod (Matching Reference Image 5)
  if (!agent) {
    const authPod = (
      <div className="w-full">
        <AuthGlassLayout
          role="agent"
          title={authTab === 'login' ? 'LOGIN' : authTab === 'register' ? 'REGISTER' : authTab === 'verify' ? 'VERIFY' : (authTab === 'forgot' || authTab === 'reset') ? (agentResetStep === 'email' ? 'RECOVER' : agentResetStep === 'otp' ? 'VERIFY OTP' : 'NEW PASSWORD') : 'AGENT'}
          isModal={isModal}
          onClose={onClose}
          onNavigateHome={onClose}
          rememberMeSlot={
            authTab === 'login' ? (
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-slate-300 hover:text-white transition-colors">Remember me</span>
              </label>
            ) : null
          }
          forgotPasswordSlot={
            authTab === 'login' ? (
              <button
                type="button"
                data-test="link-agent-forgot-password"
                data-testid="link-agent-forgot-password"
                onClick={() => {
                  setAgentForgotEmail(loginEmail);
                  setAgentResetStep('email');
                  setAuthTab('forgot');
                }}
                className="text-slate-300 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
              >
                Forgot password?
              </button>
            ) : null
          }
        >
          {/* Mode Switcher Pills */}
          <div className="flex bg-white/5 p-1 rounded-full border border-white/10 text-xs font-bold mb-4">
            <button
              type="button"
              data-test="tab-agent-login"
              data-testid="tab-agent-login"
              onClick={() => setAuthTab('login')}
              className={`flex-1 py-1.5 rounded-full transition-all text-center cursor-pointer ${
                authTab === 'login'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              data-test="tab-agent-register"
              data-testid="tab-agent-register"
              onClick={() => setAuthTab('register')}
              className={`flex-1 py-1.5 rounded-full transition-all text-center cursor-pointer ${
                authTab === 'register'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              data-test="tab-agent-verify"
              data-testid="tab-agent-verify"
              onClick={() => setAuthTab('verify')}
              className={`flex-1 py-1.5 rounded-full transition-all text-center cursor-pointer ${
                authTab === 'verify'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Verify Email
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN (Image 5 style) */}
          {authTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="Username"
                  data-test="input-agent-login-email"
                  data-testid="input-agent-login-email"
                  className="w-full pl-6 pr-14 py-4 bg-white/[0.08] border border-white/20 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-full text-white text-sm outline-none transition-all placeholder:text-slate-400 font-medium"
                />
                <UserIcon className="w-5 h-5 text-white/80 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="************"
                  data-test="input-agent-login-password"
                  data-testid="input-agent-login-password"
                  className="w-full pl-6 pr-14 py-4 bg-white/[0.08] border border-white/20 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-full text-white text-sm outline-none transition-all placeholder:text-slate-400 font-medium tracking-widest"
                />
                <Lock className="w-5 h-5 text-white/80 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="submit"
                disabled={loading}
                data-test="btn-agent-login"
                data-testid="btn-agent-login"
                className="w-full py-4 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 hover:border-white/60 text-white font-extrabold text-xs uppercase tracking-[0.25em] shadow-xl hover:shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'AUTHENTICATING...' : 'LOGIN'}
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('agent.uday@shopsphere.test')}
                data-test="btn-quick-agent-demo"
                data-testid="btn-quick-agent-demo"
                className="w-full py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-emerald-300 font-bold text-xs transition-colors cursor-pointer border border-white/10 flex items-center justify-center gap-2 mt-2"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>⚡ Quick Demo Login as Uday (Active Verified Agent)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('agent.alex@shopsphere.test')}
                data-test="btn-quick-demo-agent"
                data-testid="btn-quick-demo-agent"
                className="w-full py-2 rounded-full bg-white/[0.02] hover:bg-white/[0.06] text-amber-300 font-bold text-xs transition-colors cursor-pointer border border-white/5 flex items-center justify-center gap-2 mt-1"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ Quick Demo Login as Alex Rivers (Active Verified Agent)</span>
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {authTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Full Name"
                  data-test="input-agent-reg-name"
                  data-testid="input-agent-reg-name"
                  className="w-full px-5 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                />
              </div>
              <div>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="Agent Email Address"
                  data-test="input-agent-reg-email"
                  data-testid="input-agent-reg-email"
                  className="w-full px-5 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                />
              </div>
              <div>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  placeholder="Phone Number (+91)"
                  data-test="input-agent-reg-phone"
                  data-testid="input-agent-reg-phone"
                  className="w-full px-5 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={regVehicle}
                  onChange={e => setRegVehicle(e.target.value)}
                  data-test="select-agent-vehicle"
                  data-testid="select-agent-vehicle"
                  className="px-4 py-2.5 bg-slate-900 border border-white/20 rounded-full text-white text-xs"
                >
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Electric Bike">Electric Bike</option>
                  <option value="Van">Delivery Van</option>
                </select>
                <select
                  value={regZone}
                  onChange={e => setRegZone(e.target.value)}
                  data-test="select-agent-zone"
                  data-testid="select-agent-zone"
                  className="px-4 py-2.5 bg-slate-900 border border-white/20 rounded-full text-white text-xs"
                >
                  <option value="Hitech City Hub">Hitech City Hub</option>
                  <option value="Madhapur / Jubilee Hills">Madhapur / Jubilee</option>
                  <option value="Tellapur / Osman Nagar">Tellapur / Osman Nagar</option>
                  <option value="Gachibowli Hub">Gachibowli Hub</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                data-test="btn-agent-register"
                data-testid="btn-agent-register"
                className="w-full py-3.5 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 text-white font-extrabold text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer mt-2"
              >
                {loading ? 'Submitting...' : 'Register as Delivery Partner'}
              </button>
            </form>
          )}

          {/* TAB 3: VERIFY EMAIL */}
          {authTab === 'verify' && (
            <form onSubmit={handleVerifyEmail} className="space-y-3">
              <p className="text-[11px] text-slate-300 text-center">
                Enter the 6-digit verification code sent to your email to receive your password.
              </p>
              <div>
                <input
                  type="email"
                  required
                  value={verifyEmail}
                  onChange={e => setVerifyEmail(e.target.value)}
                  placeholder="Registered Email"
                  data-test="input-verify-email"
                  data-testid="input-verify-email"
                  className="w-full px-5 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verifyToken}
                  onChange={e => setVerifyToken(e.target.value)}
                  placeholder="6-Digit Verification Code"
                  data-test="input-verify-code input-verify-token"
                  data-testid="input-verify-token"
                  className="w-full px-5 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-center font-mono font-bold tracking-widest text-sm outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                data-test="btn-verify-submit btn-verify-agent-email"
                data-testid="btn-verify-agent-email"
                className="w-full py-3.5 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 text-white font-extrabold text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify Email & Dispatch Password'}
              </button>
            </form>
          )}

          {/* TAB 4 & 5: AGENT FORGOT & RESET PASSWORD (3-STEP STATE MACHINE) */}
          {(authTab === 'forgot' || authTab === 'reset') && (
            <div className="space-y-4">
              {/* STEP 1: EMAIL INPUT */}
              {agentResetStep === 'email' && (
                <form onSubmit={handleAgentForgotPassword} className="space-y-3">
                  <p className="text-[11px] text-slate-300 text-center">
                    Enter your registered agent email to receive a 6-digit password reset OTP.
                  </p>
                  <div>
                    <input
                      type="email"
                      required
                      value={agentForgotEmail}
                      onChange={e => {
                        setAgentForgotEmail(e.target.value);
                        setAgentResetEmail(e.target.value);
                      }}
                      placeholder="Agent Email Address"
                      data-test="input-agent-forgot-email"
                      data-testid="input-agent-forgot-email"
                      className="w-full px-5 py-3 bg-white/[0.08] border border-white/20 focus:border-emerald-400 rounded-full text-white text-xs outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    data-test="btn-agent-forgot-submit"
                    data-testid="btn-agent-forgot-submit"
                    className="w-full py-3.5 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 text-white font-extrabold text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer"
                  >
                    {loading ? 'Sending OTP...' : 'Send Password Reset OTP'}
                  </button>
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                      type="button"
                      data-test="link-agent-have-otp"
                      data-testid="link-agent-have-otp"
                      onClick={() => {
                        setAgentResetEmail(agentForgotEmail);
                        setAgentResetStep('new_password');
                        setAuthTab('reset');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      Already have an OTP code? Reset Password &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setAgentResetStep('email');
                      }}
                      className="text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      &larr; Back to Login
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: OTP VERIFICATION */}
              {agentResetStep === 'otp' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium space-y-1">
                    <p className="text-[11px] text-emerald-200/90">
                      OTP sent to: <span className="font-semibold text-white">{agentResetEmail || agentForgotEmail}</span>
                    </p>
                  </div>

                  <form onSubmit={handleAgentVerifyOtp} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        maxLength={6}
                        value={agentResetOtp}
                        onChange={e => setAgentResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-Digit Email OTP"
                        data-test="input-agent-reset-otp"
                        data-testid="input-agent-reset-otp"
                        className="w-full py-3.5 bg-white/[0.08] border border-white/20 focus:border-emerald-400 rounded-full text-white text-base font-mono font-bold tracking-widest text-center outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={agentOtpVerifyLoading || agentResetOtp.length !== 6}
                      data-test="btn-agent-verify-otp"
                      data-testid="btn-agent-verify-otp"
                      className="w-full py-3.5 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 text-white font-extrabold text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {agentOtpVerifyLoading ? 'Verifying OTP...' : 'Verify OTP & Proceed'}
                    </button>
                  </form>

                  <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                      type="button"
                      data-test="btn-agent-resend-otp"
                      data-testid="btn-agent-resend-otp"
                      onClick={handleAgentForgotPassword}
                      disabled={loading}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      Resend OTP Code
                    </button>
                    <button
                      type="button"
                      data-test="link-agent-have-otp"
                      data-testid="link-agent-have-otp"
                      onClick={() => {
                        setAgentResetStep('new_password');
                        setAuthTab('reset');
                      }}
                      className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Already have an OTP code? Reset Password &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentResetStep('email')}
                      className="text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      &larr; Back to Email
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: SET NEW PASSWORD */}
              {agentResetStep === 'new_password' && (
                <form onSubmit={handleAgentResetPassword} className="space-y-3">
                  <div data-test="agent-otp-verified-badge" data-testid="agent-otp-verified-badge" className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Email OTP Verified ✓</span>
                  </div>

                  <div>
                    <input
                      type="email"
                      required
                      value={agentResetEmail || agentForgotEmail}
                      onChange={e => {
                        setAgentResetEmail(e.target.value);
                        setAgentForgotEmail(e.target.value);
                      }}
                      placeholder="Agent Email Address"
                      data-test="input-agent-reset-email"
                      data-testid="input-agent-reset-email"
                      className="w-full px-5 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={agentResetOtp}
                      onChange={e => setAgentResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-Digit Verification OTP"
                      data-test="input-agent-reset-otp"
                      data-testid="input-agent-reset-otp"
                      className="w-full py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-sm font-mono font-bold tracking-widest text-center outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={agentResetPassword}
                      onChange={e => setAgentResetPassword(e.target.value)}
                      placeholder="New Agent Password (min 6 chars)"
                      data-test="input-agent-reset-password"
                      data-testid="input-agent-reset-password"
                      className="w-full px-5 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={agentResetConfirmPassword}
                      onChange={e => setAgentResetConfirmPassword(e.target.value)}
                      placeholder="Confirm New Password"
                      data-test="input-agent-reset-confirm-password"
                      data-testid="input-agent-reset-confirm-password"
                      className="w-full px-5 py-3 bg-white/[0.08] border border-white/20 rounded-full text-white text-xs outline-none"
                    />
                  </div>

                  {agentResetConfirmPassword && (
                    <p className={`text-[11px] px-4 font-semibold ${agentResetPassword === agentResetConfirmPassword ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {agentResetPassword === agentResetConfirmPassword ? '✓ Password confirmation verified' : '⚠ Password confirmation mismatch'}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    data-test="btn-agent-reset-submit"
                    data-testid="btn-agent-reset-submit"
                    className="w-full py-3.5 rounded-full bg-gradient-to-b from-white/25 via-white/10 to-black/60 border border-white/30 text-white font-extrabold text-xs uppercase tracking-widest shadow-xl transition-all cursor-pointer"
                  >
                    {loading ? 'Updating Password...' : 'Save Password & Login'}
                  </button>
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                      type="button"
                      data-test="link-agent-have-otp"
                      data-testid="link-agent-have-otp"
                      onClick={() => setAgentResetStep('otp')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      &larr; Re-enter OTP Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setAgentResetStep('email');
                      }}
                      className="text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      &larr; Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </AuthGlassLayout>
      </div>
    );

    if (isModal) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#030611] backdrop-blur-md animate-in fade-in duration-200">
          {authPod}
        </div>
      );
    }
    return authPod;
  }

  // 2. Authenticated Delivery Agent Executive Dashboard (Matching Reference Image 7)
  return (
    <div className={isModal ? "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" : "min-h-screen bg-[#030611] text-slate-100 flex flex-col justify-center items-center p-2 sm:p-4 md:p-6"}>
      <div
        data-test="delivery-agent-portal-modal"
        data-testid="delivery-agent-portal-modal"
        className="bg-[#070D1E] rounded-3xl shadow-2xl max-w-5xl w-full mx-auto overflow-hidden border border-blue-500/20 flex flex-col max-h-[94vh] text-white animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-[#0B132B] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-extrabold shadow-md">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  ShopSphere Delivery Partner Portal <span className="text-xs bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono font-bold">IN</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Hyderabad Hub
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                FIFO Queue Auto-Assignment, Masked Logistics, OTP Gates &amp; Hyderabad Store Settlements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-test="btn-delivery-back-storefront"
              data-testid="btn-delivery-back-storefront"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              title="Return to Customer Storefront"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storefront</span>
            </button>
            <button
              data-test="agent-portal-close"
              data-testid="agent-portal-close"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/20 border-b border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Signed In Queue Status Banner (Matching Image 7) */}
        <div className="p-3 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg || 'Signed in successfully! Joined active Hyderabad FIFO queue.'}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {agent.mustChangePassword ? (
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

            {/* Agent Bar (Matching Image 7) */}
            <div className="p-4 bg-[#0B132B]/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3">
                <img
                  src={agent.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
                  alt={agent.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400 shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">{agent.name}</span>
                    {agent.agentCode && (
                      <span className="font-mono text-[10px] bg-white/10 text-slate-300 border border-white/15 px-2 py-0.5 rounded-full font-bold">
                        {agent.agentCode}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      🟢 Online (FIFO Rank #{agent.fifoRank || 1})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>🏍️ {agent.vehicleType || 'Motorcycle'}</span>
                    <span>📍 {agent.deliveryZone || 'Downtown'}</span>
                    <span>💼 {agent.gender ? agent.gender.replace(/_/g, ' ') : 'male'}</span>
                  </div>
                </div>
              </div>

              {/* Wallet & Actions (Matching Image 7) */}
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-right">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Wallet Earnings</div>
                  <div className="text-sm font-extrabold font-mono text-emerald-300">
                    ₹{Number(agent.totalEarnings ?? 0).toFixed(2)}
                  </div>
                </div>

                {/* Agent In-App Notification Bell */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                    title="Alerts & Notifications"
                    className="relative p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer border border-white/10"
                  >
                    <Bell className="w-4 h-4 text-slate-300" />
                    {unreadNotifs > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {unreadNotifs > 9 ? '9+' : unreadNotifs}
                      </span>
                    )}
                  </button>

                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs text-slate-200">
                      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-indigo-400" />
                          Alerts ({unreadNotifs} unread)
                        </span>
                        {unreadNotifs > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllAgentNotifsRead}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-500">No alerts yet</div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => !n.isRead && handleMarkAgentNotifRead(n.id)}
                              className={`p-3 transition-colors cursor-pointer ${
                                n.isRead ? 'bg-slate-900/40 text-slate-400' : 'bg-slate-800/60 text-slate-200'
                              } hover:bg-slate-800`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-white">{n.title}</span>
                                {n.amount && (
                                  <span className="font-mono text-emerald-400 font-bold text-[11px]">
                                    ₹{Number(n.amount).toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300 mt-0.5">{n.message}</p>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                                <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {!n.isRead && <span className="text-indigo-400 font-bold">● New</span>}
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
                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-white cursor-pointer shadow-xs transition-colors"
                >
                  Profile
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dashboard Tabs (Matching Image 7) */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 text-xs font-bold px-4 py-2 bg-[#070D1E]">
              <button
                type="button"
                data-test="tab-active-deliveries"
                data-testid="tab-active-deliveries"
                onClick={() => setActiveTab('deliveries')}
                className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'deliveries'
                    ? 'text-blue-400 border-b-2 border-blue-500 font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Assigned Deliveries ({orders.length})</span>
              </button>
              <button
                type="button"
                data-test="tab-agent-performance"
                data-testid="tab-agent-performance"
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'analytics'
                    ? 'text-blue-400 border-b-2 border-blue-500 font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>My Performance</span>
              </button>
              <button
                type="button"
                data-test="tab-earnings-wallet"
                data-testid="tab-earnings-wallet"
                onClick={() => setActiveTab('earnings')}
                className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'earnings'
                    ? 'text-blue-400 border-b-2 border-blue-500 font-extrabold'
                    : 'text-slate-400 hover:text-white'
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
                className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'store-deposit'
                    ? 'text-blue-400 border-b-2 border-blue-500 font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Store Cash Deposit</span>
                {agent.hasPendingCashDeposit && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                    🔒 Locked
                  </span>
                )}
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#040814] text-slate-100">
              {activeTab === 'analytics' && (
                <div className="space-y-4">
                  <AgentAnalyticsHub
                    token={token || 'demo-agent-token'}
                    isOnline={Boolean(agent.isActive ?? true)}
                    onToggleDuty={() => handleToggleDuty(!Boolean(agent.isActive ?? true))}
                    activeStoreName="Hitech City / Madhapur Hub"
                  />
                </div>
              )}

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

                            {/* Transferred Order Badge */}
                            {order.transferReason && (
                              <div
                                data-test={`agent-transferred-order-badge-${order.orderNumber}`}
                                data-testid={`agent-transferred-order-badge-${order.orderNumber}`}
                                className="p-2.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-950 text-xs font-bold flex items-center gap-2 mb-3"
                              >
                                <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>
                                  Transferred from {order.transferredFromAgentName || 'Previous Agent'} &bull; Reason: {order.transferReason}
                                </span>
                              </div>
                            )}

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

                            {/* Synchronized Server Countdown & Delay Alert */}
                            <DeliveryEtaCountdown
                              orderId={order.orderNumber}
                              orderStatus={order.orderStatus}
                              initialProceededAt={order.orderProceededAt}
                              initialEstimatedDeliveryAt={order.estimatedDeliveryAt}
                              initialIsDelayed={order.isDelayed}
                              initialExtraDelaySeconds={order.extraDelaySeconds}
                              className="mb-3"
                            />

                            {/* Live Map for In-Transit Orders */}
                            {isOutForDelivery && (
                              <div className="mb-3">
                                {(() => {
                                  const destCoords = resolveAddressCoordinates(
                                    order.shippingAddress,
                                    order.customerLat || order.deliveryLat,
                                    order.customerLng || order.deliveryLng
                                  );
                                  return (
                                    <LiveOrderMap
                                      orderId={order.orderNumber}
                                      destinationLat={destCoords.lat}
                                      destinationLng={destCoords.lng}
                                      customerAddress={`${order.shippingAddress.street}, ${order.shippingAddress.city}`}
                                      orderStatus={order.orderStatus}
                                      assignedAgentName={order.assignedAgentName || agent.name}
                                      assignedAgentPhone={order.assignedAgentPhone || agent.phone}
                                      agentCoords={
                                        order.agentLat && order.agentLng
                                          ? { lat: order.agentLat, lng: order.agentLng }
                                          : { lat: agent.currentLat || 17.4486, lng: agent.currentLng || 78.3908 }
                                      }
                                      isAgentView={true}
                                      onLocationUpdate={(coords) => {
                                        setAgent(prev => prev ? { ...prev, currentLat: coords.lat, currentLng: coords.lng } : null);
                                      }}
                                    />
                                  );
                                })()}
                              </div>
                            )}

                            {/* Emergency Order Transfer Action */}
                            {(isOutForDelivery || isPendingAcceptance) && (
                              <div className="flex justify-end mb-3">
                                <button
                                  type="button"
                                  data-test={`btn-transfer-order-${order.orderNumber}`}
                                  data-testid={`btn-transfer-order-${order.orderNumber}`}
                                  onClick={() => setTransferringOrder(order)}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Transfer Order to Nearest Agent</span>
                                </button>
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
                              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-emerald-400 font-bold">
                                <span>✓ Delivered &amp; Commission Credited</span>
                                <span className="font-mono">+₹{(order.deliveryFee ?? agent.commissionRate ?? 15).toFixed(2)}</span>
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
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/25">
                      <div className="text-xs font-bold text-emerald-400 uppercase">Total Wallet Balance</div>
                      <div className="text-2xl font-black text-emerald-300 font-mono mt-1">
                        ₹{agent.totalEarnings.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-emerald-500 mt-1">Ready for weekly bank transfer (+91 UPI)</p>
                    </div>

                    <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/25">
                      <div className="text-xs font-bold text-indigo-400 uppercase">Delivered Orders</div>
                      <div className="text-2xl font-black text-indigo-300 font-mono mt-1">
                        {agent.deliveredOrdersCount}
                      </div>
                      <p className="text-[11px] text-indigo-400 mt-1">Successfully fulfilled</p>
                    </div>

                    <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/25">
                      <div className="text-xs font-bold text-blue-400 uppercase">Per-Order Commission</div>
                      <div className="text-2xl font-black text-blue-300 font-mono mt-1">
                        ₹{(agent.commissionRate ?? 15).toFixed(2)}
                      </div>
                      <p className="text-[11px] text-blue-400 mt-1">Guaranteed payout per order</p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#0B132B]/80 rounded-2xl border border-white/10">
                    <h4 className="font-bold text-white text-xs uppercase mb-3">
                      Completed Deliveries History ({orders.filter(o => o.orderStatus === 'delivered').length})
                    </h4>
                    <div className="divide-y divide-white/5 text-xs">
                      {orders
                        .filter(o => o.orderStatus === 'delivered')
                        .map(o => (
                          <div key={o.id} className="py-2.5 flex items-center justify-between">
                            <div>
                              <p className="font-mono font-bold text-indigo-400">{o.orderNumber}</p>
                              <p className="text-slate-400 text-[11px]">
                                {o.userName} • {o.shippingAddress.city}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-extrabold text-emerald-400">
                                +₹{(o.deliveryFee ?? agent.commissionRate ?? 15).toFixed(2)}
                              </span>
                              <p className="text-[10px] text-slate-500">Credited to Wallet</p>
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
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : agent.hasPendingCashDeposit
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/30'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Banknote className={`w-5 h-5 ${
                            agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED'
                              ? 'text-rose-400'
                              : agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                              ? 'text-amber-400'
                              : agent.hasPendingCashDeposit
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`} />
                          <h4 className="font-extrabold text-white text-sm">
                            {agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED'
                              ? 'Deposit Rejected by Store Admin'
                              : agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                              ? 'Deposit Submitted — Awaiting Store Admin Approval'
                              : agent.hasPendingCashDeposit
                              ? 'Cash Store-Deposit Required (Account Locked)'
                              : 'Account Unlocked & Ready for Orders'}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          {agent.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED' ? (
                            <>
                              <strong className="text-rose-300">Rejection Reason:</strong> {agent.depositRejectionReason || 'Cash mismatch'}. Please visit the Hyderabad Flagship Store counter to rectify and resubmit confirmation.
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
                        <div className="text-[10px] uppercase font-bold text-slate-400">Cash Balance</div>
                        <div className={`font-mono text-xl font-extrabold ${
                          agent.hasPendingCashDeposit ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          ₹{(agent.pendingCashAmount || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {agent.hasPendingCashDeposit && (
                      <div className="mt-4 pt-3 border-t border-white/10">
                        {agent.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL' ? (
                          <div className="p-2.5 bg-amber-500/20 rounded-xl text-center text-xs font-bold text-amber-300 flex items-center justify-center gap-2 border border-amber-500/30">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span>Submitted to Store Counter. Waiting for Admin verification...</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={submittingDeposit}
                            onClick={handleSubmitStoreDeposit}
                            data-test="btn-submit-store-deposit"
                            data-testid="btn-submit-store-deposit"
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
                  <div className="p-4 bg-[#0B132B]/80 border border-white/10 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <MapPin className="w-4 h-4 text-indigo-400" />
                      <span>ShopSphere Hyderabad Flagship Store &amp; Dispatch Hub</span>
                    </div>
                    <p className="text-slate-400">
                      Address: Plot 42, Hitech City Main Rd, Madhapur, Hyderabad, Telangana 500081<br />
                      Counter Hours: 08:00 AM – 10:00 PM IST | Cashier Desk: Counter #3 (Logistics Settlement)
                    </p>
                  </div>

                  {/* Breakdown of Linked COD Cash Orders */}
                  <div className="p-4 bg-[#0B132B]/80 rounded-2xl border border-white/10">
                    <h4 className="font-bold text-white text-xs uppercase mb-3">
                      Cash on Delivery Orders in Hand ({orders.filter(o => o.codPaymentMethod === 'cash' || o.paymentMethod === 'cod').length})
                    </h4>
                    {orders.filter(o => o.codPaymentMethod === 'cash' || o.paymentMethod === 'cod').length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No COD cash orders recorded</p>
                    ) : (
                      <div className="divide-y divide-white/5 text-xs">
                        {orders
                          .filter(o => o.codPaymentMethod === 'cash' || o.paymentMethod === 'cod')
                          .map(o => (
                            <div key={o.id} className="py-2.5 flex items-center justify-between">
                              <div>
                                <p className="font-mono font-bold text-white">#{o.orderNumber}</p>
                                <p className="text-slate-400 text-[11px]">{o.userName} • {o.shippingAddress.city}</p>
                                <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.2 rounded-full font-bold ${
                                  o.paymentSettlementStatus === 'CASH_DEPOSITED_AT_STORE' || o.paymentSettlementStatus === 'SETTLED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : o.paymentSettlementStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {o.paymentSettlementStatus || 'CASH_COLLECTED'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-extrabold text-white">
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

      {/* Emergency Order Transfer Modal */}
      <EmergencyTransferModal
        isOpen={Boolean(transferringOrder)}
        order={transferringOrder}
        token={token}
        onClose={() => setTransferringOrder(null)}
        onTransferSuccess={newOrder => {
          setSuccessMsg(`Order #${newOrder.orderNumber} successfully transferred to nearest agent.`);
          fetchAssignedOrders();
          fetchAgentProfile();
        }}
      />
    </div>
  );
};
