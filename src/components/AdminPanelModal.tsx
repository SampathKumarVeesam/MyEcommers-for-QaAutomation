import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  Heart,
  Lock,
  Mail,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  AnalyticsSummary,
  CustomerActivityDetail,
  CustomerActivitySummary,
  Order,
  Product,
} from '../types.js';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCatalog: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onRefreshCatalog,
}) => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'inventory' | 'orders'>('analytics');

  // Summary & Customer Activity State
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [customers, setCustomers] = useState<CustomerActivitySummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');

  // Customer Drill-Down State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerActivityDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'orders' | 'cart' | 'wishlist'>('orders');

  // Inventory & Global Orders State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  // Fetch summary and customers list from PostgreSQL
  const fetchAnalytics = async () => {
    if (!token) return;
    setLoadingSummary(true);
    try {
      const [sumRes, custRes] = await Promise.all([
        fetch(apiUrl('/api/admin/analytics/summary'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl('/api/admin/analytics/customers'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        if (sumJson.success && sumJson.data) {
          setSummary(sumJson.data);
        }
      }

      if (custRes.ok) {
        const custJson = await custRes.json();
        if (custJson.success && custJson.data) {
          setCustomers(custJson.data);
        }
      }
    } catch (err) {
      console.error('[Admin Analytics Fetch Error]:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch inventory & global orders
  const fetchInventoryAndOrders = async () => {
    if (!token) return;
    try {
      const [prodRes, ordRes] = await Promise.all([
        fetch(apiUrl('/api/products?limit=100')),
        fetch(apiUrl('/api/orders'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        if (prodJson.success) setProducts(prodJson.data);
      }
      if (ordRes.ok) {
        const ordJson = await ordRes.json();
        if (ordJson.success) setOrders(ordJson.data);
      }
    } catch (err) {
      console.error('[Admin Data Fetch Error]:', err);
    }
  };

  // Fetch single customer drill-down
  const fetchCustomerDetail = async (customerId: string) => {
    if (!token) return;
    setLoadingDetail(true);
    setSelectedCustomerId(customerId);
    try {
      const res = await fetch(apiUrl(`/api/admin/analytics/customers/${customerId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCustomerDetail(json.data);
        }
      }
    } catch (err) {
      console.error('[Admin Customer Detail Fetch Error]:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Refresh all data
  const handleRefreshAll = async () => {
    await Promise.all([fetchAnalytics(), fetchInventoryAndOrders()]);
  };

  useEffect(() => {
    if (isOpen) {
      handleRefreshAll();
    } else {
      setSelectedCustomerId(null);
      setCustomerDetail(null);
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleUpdateStock = async (productId: string, newStock: number) => {
    try {
      const res = await fetch(apiUrl(`/api/products/${productId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock: newStock }),
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => (p.id === productId ? { ...p, stock: newStock } : p)));
        setSaveMessage('Inventory stock updated successfully!');
        setTimeout(() => setSaveMessage(null), 2500);
        onRefreshCatalog();
      }
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!token) return;
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setSaveMessage(`Order status updated to "${newStatus.toUpperCase()}" & email notification sent!`);
        setTimeout(() => setSaveMessage(null), 3000);
        await fetchInventoryAndOrders();
        if (selectedCustomerId) {
          await fetchCustomerDetail(selectedCustomerId);
        }
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSendTestEmail = async () => {
    if (!token) return;
    setTestEmailStatus('sending');
    try {
      const res = await fetch(apiUrl('/api/admin/analytics/test-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: user?.email || 'sampathkumarveesam@zohomail.in' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setTestEmailStatus('success');
        setSaveMessage(`Test email delivered via Zoho Mail SMTP to ${user?.email || 'sampathkumarveesam@zohomail.in'}!`);
      } else {
        setTestEmailStatus('error');
        setSaveMessage(`Test email failed: ${json.message || 'SMTP error'}`);
      }
    } catch (err: any) {
      setTestEmailStatus('error');
      setSaveMessage(`Test email transmission error: ${err.message}`);
    } finally {
      setTimeout(() => {
        setTestEmailStatus(null);
        setSaveMessage(null);
      }, 4000);
    }
  };

  // Filtered views
  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.username.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredProducts = products.filter(
    p =>
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.subcategory.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div
      data-test="admin-modal"
      data-testid="admin-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Navbar */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Admin &amp; Analytics Console</h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Role: {user?.role || 'Admin'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PostgreSQL 18
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as <strong className="text-white">{user?.name}</strong> ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary Tab Switcher */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs overflow-x-auto scrollbar-none max-w-full">
              <button
                data-test="admin-tab-analytics"
                data-testid="admin-tab-analytics"
                onClick={() => {
                  setActiveTab('analytics');
                  setSelectedCustomerId(null);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">Customer </span>Activity ({customers.length})
              </button>
              <button
                data-test="admin-tab-inventory"
                data-testid="admin-tab-inventory"
                onClick={() => setActiveTab('inventory')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Inventory ({products.length})
              </button>
              <button
                data-test="admin-tab-orders"
                data-testid="admin-tab-orders"
                onClick={() => setActiveTab('orders')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">Global </span>Orders ({orders.length})
              </button>
            </div>

            <button
              data-test="admin-send-test-email-button"
              data-testid="admin-send-test-email-button"
              onClick={handleSendTestEmail}
              disabled={testEmailStatus === 'sending'}
              title="Send Zoho Mail SMTP Test Verification Email"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">
                {testEmailStatus === 'sending' ? 'Sending...' : 'Test SMTP'}
              </span>
            </button>

            <button
              data-test="admin-refresh-all-button"
              data-testid="admin-refresh-all-button"
              onClick={handleRefreshAll}
              title="Refresh all metrics from PostgreSQL"
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSummary ? 'animate-spin' : ''}`} />
            </button>

            <button
              data-test="admin-close-button"
              data-testid="admin-close-button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: OVERALL SUMMARY CARDS (Top Section - Fetched Live from PostgreSQL)
           ========================================================================= */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            {/* 1. Total Customers */}
            <div
              data-test="summary-card-customers"
              data-testid="summary-card-customers"
              className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Customers</p>
                <p className="font-extrabold text-slate-900 text-base">
                  {summary ? summary.totalCustomers : <span className="text-slate-400">...</span>}
                </p>
              </div>
            </div>

            {/* 2. Total Orders */}
            <div
              data-test="summary-card-orders"
              data-testid="summary-card-orders"
              className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Orders</p>
                <p className="font-extrabold text-slate-900 text-base">
                  {summary ? summary.totalOrders : <span className="text-slate-400">...</span>}
                </p>
              </div>
            </div>

            {/* 3. Total Sales / Revenue */}
            <div
              data-test="summary-card-revenue"
              data-testid="summary-card-revenue"
              className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Platform Revenue</p>
                <p className="font-extrabold text-slate-900 text-base">
                  {summary ? `$${summary.totalSales.toFixed(2)}` : <span className="text-slate-400">...</span>}
                </p>
              </div>
            </div>

            {/* 4. Total Cart Items */}
            <div
              data-test="summary-card-cart-items"
              data-testid="summary-card-cart-items"
              className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Cart Items</p>
                <p className="font-extrabold text-slate-900 text-base">
                  {summary ? summary.totalCartItems : <span className="text-slate-400">...</span>}
                </p>
              </div>
            </div>

            {/* 5. Total Wishlist Items */}
            <div
              data-test="summary-card-wishlist-items"
              data-testid="summary-card-wishlist-items"
              className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Wishlist</p>
                <p className="font-extrabold text-slate-900 text-base">
                  {summary ? summary.totalWishlistItems : <span className="text-slate-400">...</span>}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save message notification */}
        {saveMessage && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* =========================================================================
              SECTION 3: CUSTOMER ACTIVITY & ANALYTICS TAB (Default)
             ========================================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              {/* Drill-Down Inspector Modal / Overlay (when a customer is clicked) */}
              {selectedCustomerId && (
                <div
                  data-test="customer-detail-panel"
                  data-testid="customer-detail-panel"
                  className="mb-6 bg-slate-50 border-2 border-indigo-200 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md overflow-hidden">
                        {customerDetail?.customer.avatar ? (
                          <img src={customerDetail.customer.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          customerDetail?.customer.name.charAt(0) || 'C'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900">
                            {customerDetail?.customer.name || 'Loading Customer Details...'}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                            {customerDetail?.customer.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {customerDetail?.customer.email} {customerDetail?.customer.phone ? `• ${customerDetail.customer.phone}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Drill-down Sub-tab Switcher */}
                      <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs">
                        <button
                          data-test="customer-detail-tab-orders"
                          data-testid="customer-detail-tab-orders"
                          onClick={() => setDetailTab('orders')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            detailTab === 'orders' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Orders ({customerDetail?.orders.length ?? 0})
                        </button>
                        <button
                          data-test="customer-detail-tab-cart"
                          data-testid="customer-detail-tab-cart"
                          onClick={() => setDetailTab('cart')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            detailTab === 'cart' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Cart Items ({customerDetail?.cartItems.length ?? 0})
                        </button>
                        <button
                          data-test="customer-detail-tab-wishlist"
                          data-testid="customer-detail-tab-wishlist"
                          onClick={() => setDetailTab('wishlist')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            detailTab === 'wishlist' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Wishlist ({customerDetail?.wishlistItems.length ?? 0})
                        </button>
                      </div>

                      <button
                        data-test="customer-detail-close-btn"
                        data-testid="customer-detail-close-btn"
                        onClick={() => setSelectedCustomerId(null)}
                        className="p-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-500 border border-slate-200 transition-colors cursor-pointer"
                        title="Close Inspector"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {loadingDetail ? (
                    <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Loading customer activity breakdown from PostgreSQL...</span>
                    </div>
                  ) : (
                    <div>
                      {/* Sub-tab 1: Orders */}
                      {detailTab === 'orders' && (
                        <div className="space-y-3">
                          {customerDetail && customerDetail.orders.length > 0 ? (
                            customerDetail.orders.map(order => (
                              <div
                                key={order.id}
                                data-test={`customer-order-card-${order.orderNumber}`}
                                data-testid={`customer-order-card-${order.orderNumber}`}
                                className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-indigo-700">{order.orderNumber}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-500">{new Date(order.createdAt).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900">${order.totalAmount.toFixed(2)}</span>
                                    <select
                                      data-test={`customer-order-status-select-${order.orderNumber}`}
                                      data-testid={`customer-order-status-select-${order.orderNumber}`}
                                      value={order.status?.toLowerCase() || 'processing'}
                                      disabled={updatingOrderId === String(order.id) || updatingOrderId === order.orderNumber}
                                      onChange={e => handleUpdateOrderStatus(order.orderNumber, e.target.value)}
                                      className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                                      title="Change status & send notification email"
                                    >
                                      <option value="processing">Processing</option>
                                      <option value="processed">Processed</option>
                                      <option value="out_for_delivery">Out for Delivery</option>
                                      <option value="delivered">Delivered</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Order Line Items */}
                                <div className="space-y-1.5 pt-1">
                                  {order.items.map(item => (
                                    <div key={item.id} className="flex items-center justify-between text-[11px] text-slate-600">
                                      <div className="flex items-center gap-2">
                                        {item.productImage && (
                                          <img src={item.productImage} alt="" className="w-6 h-6 rounded object-cover border" />
                                        )}
                                        <span className="font-semibold text-slate-800">{item.productName}</span>
                                        <span className="text-slate-400">x{item.quantity}</span>
                                        {item.selectedVariant && (
                                          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                                            {item.selectedVariant}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-mono font-bold text-slate-800">
                                        ${(item.price * item.quantity).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                              This customer has not placed any orders yet.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-tab 2: Cart Items */}
                      {detailTab === 'cart' && (
                        <div className="space-y-3">
                          {customerDetail && customerDetail.cartItems.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto text-xs">
                              <table className="w-full text-left divide-y divide-slate-200 min-w-[500px]">
                                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                                  <tr>
                                    <th className="p-3">Product In Cart</th>
                                    <th className="p-3">Quantity</th>
                                    <th className="p-3">Unit Price</th>
                                    <th className="p-3">Total</th>
                                    <th className="p-3">Added Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {customerDetail.cartItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                      <td className="p-3">
                                        <div className="flex items-center gap-2.5">
                                          {item.productImage && (
                                            <img src={item.productImage} alt="" className="w-8 h-8 rounded-lg object-cover border" />
                                          )}
                                          <div>
                                            <p className="font-bold text-slate-900">{item.productName}</p>
                                            <span className="text-[10px] text-slate-400 capitalize">{item.category}</span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-3 font-bold text-slate-700">{item.quantity}</td>
                                      <td className="p-3 text-slate-600">${item.unitPrice.toFixed(2)}</td>
                                      <td className="p-3 font-extrabold text-indigo-700">${item.totalPrice.toFixed(2)}</td>
                                      <td className="p-3 text-slate-400 text-[11px]">{new Date(item.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                              No items currently in this customer&apos;s cart.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-tab 3: Wishlist */}
                      {detailTab === 'wishlist' && (
                        <div className="space-y-3">
                          {customerDetail && customerDetail.wishlistItems.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto text-xs">
                              <table className="w-full text-left divide-y divide-slate-200 min-w-[500px]">
                                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                                  <tr>
                                    <th className="p-3">Saved Product</th>
                                    <th className="p-3">Category</th>
                                    <th className="p-3">Price</th>
                                    <th className="p-3">Date Saved</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {customerDetail.wishlistItems.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                      <td className="p-3">
                                        <div className="flex items-center gap-2.5">
                                          {item.productImage && (
                                            <img src={item.productImage} alt="" className="w-8 h-8 rounded-lg object-cover border" />
                                          )}
                                          <p className="font-bold text-slate-900">{item.productName}</p>
                                        </div>
                                      </td>
                                      <td className="p-3 text-slate-600 capitalize">{item.category}</td>
                                      <td className="p-3 font-extrabold text-slate-900">${item.price.toFixed(2)}</td>
                                      <td className="p-3 text-slate-400 text-[11px]">{new Date(item.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                              This customer has not saved any items to their wishlist.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Search & Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    data-test="admin-customer-search-input"
                    data-testid="admin-customer-search-input"
                    placeholder="Search customers by name, email, or username..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Showing <strong className="text-slate-800">{filteredCustomers.length}</strong> of{' '}
                  <strong className="text-slate-800">{customers.length}</strong> registered customers
                </div>
              </div>

              {/* Main Customer Activity Table */}
              <div className="border border-slate-200 rounded-2xl overflow-x-auto text-xs bg-white shadow-2xs">
                <table className="w-full text-left divide-y divide-slate-200 min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Email &amp; Phone</th>
                      <th className="p-3.5">Joined Date</th>
                      <th className="p-3.5 text-center">Orders Placed</th>
                      <th className="p-3.5 text-center">In Cart</th>
                      <th className="p-3.5 text-center">Wishlist</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(cust => (
                        <tr
                          key={cust.id}
                          data-test={`customer-row-${cust.id}`}
                          data-testid={`customer-row-${cust.id}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            selectedCustomerId === cust.id ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          {/* Name + Avatar */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs overflow-hidden border border-slate-200">
                                {cust.avatar ? (
                                  <img src={cust.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  cust.name.charAt(0) || 'C'
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{cust.name}</p>
                                <span className="text-[10px] font-mono text-slate-400">@{cust.username}</span>
                              </div>
                            </div>
                          </td>

                          {/* Email & Phone */}
                          <td className="p-3.5">
                            <p className="font-medium text-slate-800">{cust.email}</p>
                            <p className="text-[10px] text-slate-400">{cust.phone || 'No phone'}</p>
                          </td>

                          {/* Joined Date */}
                          <td className="p-3.5 text-slate-500 font-medium">
                            {new Date(cust.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          {/* Number of Orders Placed */}
                          <td className="p-3.5 text-center">
                            <span
                              data-test={`cust-orders-count-${cust.id}`}
                              data-testid={`cust-orders-count-${cust.id}`}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                cust.ordersCount > 0
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {cust.ordersCount} {cust.ordersCount === 1 ? 'order' : 'orders'}
                              {cust.totalSpent > 0 && (
                                <span className="font-mono text-[10px] font-normal text-indigo-500 border-l border-indigo-200 pl-1">
                                  ${cust.totalSpent.toFixed(2)}
                                </span>
                              )}
                            </span>
                          </td>

                          {/* Number of Cart Items */}
                          <td className="p-3.5 text-center">
                            <span
                              data-test={`cust-cart-count-${cust.id}`}
                              data-testid={`cust-cart-count-${cust.id}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                cust.cartItemsCount > 0
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <ShoppingBag className="w-3 h-3" />
                              {cust.cartItemsCount}
                            </span>
                          </td>

                          {/* Number of Wishlist Items */}
                          <td className="p-3.5 text-center">
                            <span
                              data-test={`cust-wishlist-count-${cust.id}`}
                              data-testid={`cust-wishlist-count-${cust.id}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                cust.wishlistItemsCount > 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <Heart className="w-3 h-3" />
                              {cust.wishlistItemsCount}
                            </span>
                          </td>

                          {/* Inspect Activity Button */}
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              data-test={`inspect-cust-${cust.id}`}
                              data-testid={`inspect-cust-${cust.id}`}
                              onClick={() => fetchCustomerDetail(cust.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold text-xs transition-all cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect Activity</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No customers found matching &quot;{customerSearch}&quot;
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 4: INVENTORY TAB (Stock Adjustment)
             ========================================================================= */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    data-test="admin-product-search-input"
                    data-testid="admin-product-search-input"
                    placeholder="Filter products..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  data-test="admin-refresh-button"
                  data-testid="admin-refresh-button"
                  onClick={fetchInventoryAndOrders}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Refresh Stock</span>
                </button>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-2xl overflow-x-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-200 min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Stock Units</th>
                      <th className="p-3">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img src={p.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover border" />
                            <div>
                              <p className="font-bold text-slate-900 line-clamp-1">{p.title}</p>
                              <p className="text-[10px] text-slate-400 font-mono">ID: {p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="capitalize font-medium text-slate-600">{p.subcategory}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">${p.price.toFixed(2)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              data-test={`admin-stock-input-${p.id}`}
                              data-testid={`admin-stock-input-${p.id}`}
                              min={0}
                              value={p.stock}
                              onChange={e => handleUpdateStock(p.id, parseInt(e.target.value, 10) || 0)}
                              className="w-16 p-1 text-center font-mono font-bold bg-slate-50 rounded border border-slate-200 text-xs"
                            />
                            {p.stock <= 10 && (
                              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> Low
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-amber-600">★ {p.rating.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 5: GLOBAL ORDERS TAB
             ========================================================================= */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl overflow-x-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-200 min-w-[650px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Order Number</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Destination</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Grand Total</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {orders.map(o => (
                      <tr
                        key={o.id}
                        data-test={`admin-order-row-${o.orderNumber}`}
                        data-testid={`admin-order-row-${o.orderNumber}`}
                        className="hover:bg-slate-50/50"
                      >
                        <td className="p-3 font-mono font-bold text-indigo-700">{o.orderNumber}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{o.userName}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{o.userEmail}</p>
                        </td>
                        <td className="p-3 text-slate-600">
                          {o.shippingAddress.city}, {o.shippingAddress.state}
                        </td>
                        <td className="p-3">
                          <span className="uppercase font-semibold text-slate-700">{o.paymentMethod}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">${o.grandTotal.toFixed(2)}</td>
                        <td className="p-3">
                          <select
                            data-test={`admin-order-status-select-${o.orderNumber}`}
                            data-testid={`admin-order-status-select-${o.orderNumber}`}
                            value={o.orderStatus?.toLowerCase() || 'processing'}
                            disabled={updatingOrderId === o.id || updatingOrderId === o.orderNumber}
                            onChange={e => handleUpdateOrderStatus(o.orderNumber || o.id, e.target.value)}
                            className="text-[11px] font-bold uppercase px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                            title="Change status & send notification email"
                          >
                            <option value="processing">Processing</option>
                            <option value="processed">Processed</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
