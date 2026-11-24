import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  Check,
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
  PlusCircle,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../config/api.js';
import { useAuth } from '../context/AuthContext.js';
import { LiveRouteMap } from './LiveRouteMap.js';
import { AdminOverviewDashboard } from './analytics/AdminOverviewDashboard.js';
import { ChartErrorBoundary } from './analytics/ChartErrorBoundary.js';
import { UserAnalyticsModal } from './analytics/UserAnalyticsModal.js';
import {
  AmountHandlingSummary,
  AnalyticsSummary,
  AppNotification,
  CustomerActivityDetail,
  CustomerActivitySummary,
  DeliveryAgent,
  Order,
  Product,
  ProductCategory,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'inventory' | 'orders' | 'add-product' | 'agents' | 'amount-handling'>('overview');
  const [analyticsModalUser, setAnalyticsModalUser] = useState<{ id: string; type: 'customer' | 'agent' } | null>(null);
  const contentBodyRef = useRef<HTMLDivElement>(null);

  const [viewMapOrderId, setViewMapOrderId] = useState<string | null>(null);

  // In-App Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // Amount Collection & Cash Handling Dashboard State
  const [amountSummary, setAmountSummary] = useState<AmountHandlingSummary | null>(null);
  const [loadingAmountSummary, setLoadingAmountSummary] = useState(false);
  const [rejectModalAgent, setRejectModalAgent] = useState<AmountHandlingSummary['depositApprovalAgents'][0] | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejectingDeposit, setRejectingDeposit] = useState(false);
  const [approvingDepositAgentId, setApprovingDepositAgentId] = useState<string | null>(null);

  // Delivery Agents State
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showAddAgentForm, setShowAddAgentForm] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentGender, setNewAgentGender] = useState<string>('male');
  const [newAgentVehicle, setNewAgentVehicle] = useState('Motorcycle');
  const [newAgentZone, setNewAgentZone] = useState('Central Hub');
  const [newAgentRate, setNewAgentRate] = useState('15.00');

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

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    title: '',
    category: 'electronics' as ProductCategory,
    subcategory: 'Smartwatches',
    price: '',
    compareAtPrice: '',
    stock: '25',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    description: '',
    tags: 'featured, new-arrival',
    featured: true,
  });
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productCreateError, setProductCreateError] = useState<string | null>(null);
  const [productCreateSuccess, setProductCreateSuccess] = useState<string | null>(null);

  const sampleProductPresets = [
    {
      title: 'Apple Watch Ultra 2 Titanium GPS + Cellular',
      category: 'electronics' as ProductCategory,
      subcategory: 'Smartwatches',
      price: '799.00',
      compareAtPrice: '899.00',
      stock: '20',
      imageUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
      description: 'Rugged titanium smartwatch with precision dual-frequency GPS, action button, and up to 36 hours of battery life.',
      tags: 'apple, smartwatch, titanium, premium, fitness',
      featured: true,
    },
    {
      title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
      category: 'audio' as ProductCategory,
      subcategory: 'Over-Ear Headphones',
      price: '349.99',
      compareAtPrice: '399.99',
      stock: '30',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      description: 'Industry-leading noise cancellation, two processors, 8 microphones, and up to 30 hours of continuous playback.',
      tags: 'sony, audio, headphones, noise-canceling, bluetooth',
      featured: true,
    },
    {
      title: 'Italian Wool-Cashmere Tailored Overcoat',
      category: 'fashion' as ProductCategory,
      subcategory: 'Outerwear',
      price: '320.00',
      compareAtPrice: '395.00',
      stock: '15',
      imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
      description: 'Handcrafted luxury overcoat made with fine Italian wool and soft cashmere blend for exceptional warmth and silhouette.',
      tags: 'fashion, outerwear, coat, luxury, winter',
      featured: true,
    },
    {
      title: 'Maison Noir Luxury Extrait de Parfum (100ml)',
      category: 'beauty' as ProductCategory,
      subcategory: 'Fragrances',
      price: '185.00',
      compareAtPrice: '220.00',
      stock: '25',
      imageUrl: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80',
      description: 'An alluring, long-lasting artisan perfume featuring Calabrian bergamot, dark amber, smoked vanilla, and Haitian vetiver.',
      tags: 'beauty, perfume, luxury, fragrance, artisan',
      featured: true,
    },
  ];

  const handleAutoFillSample = (index?: number) => {
    const selected =
      index !== undefined
        ? sampleProductPresets[index]
        : sampleProductPresets[Math.floor(Math.random() * sampleProductPresets.length)];
    setNewProduct({ ...selected });
    setProductCreateError(null);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setProductCreateError('Authentication token missing. Please sign in as admin again.');
      return;
    }

    if (!newProduct.title.trim()) {
      setProductCreateError('Product title is required.');
      return;
    }

    if (!newProduct.price || isNaN(Number(newProduct.price)) || Number(newProduct.price) <= 0) {
      setProductCreateError('Please specify a valid price greater than $0.');
      return;
    }

    setCreatingProduct(true);
    setProductCreateError(null);
    setProductCreateSuccess(null);

    try {
      const tagsArray = newProduct.tags
        ? newProduct.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const payload = {
        title: newProduct.title.trim(),
        category: newProduct.category,
        subcategory: newProduct.subcategory.trim() || 'General',
        price: parseFloat(newProduct.price),
        compareAtPrice: newProduct.compareAtPrice ? parseFloat(newProduct.compareAtPrice) : undefined,
        stock: parseInt(newProduct.stock || '10', 10),
        images: [newProduct.imageUrl.trim() || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'],
        description: newProduct.description.trim(),
        tags: tagsArray,
        featured: Boolean(newProduct.featured),
      };

      const res = await fetch(apiUrl('/api/admin/products'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const createdTitle = json.data?.title || payload.title;
        setProductCreateSuccess(`Product "${createdTitle}" created and saved to database successfully!`);
        setSaveMessage(`Product "${createdTitle}" added to catalog & inventory!`);
        setTimeout(() => setSaveMessage(null), 3500);

        // Instantly refresh inventory list
        await fetchInventoryAndOrders();

        // Refresh global customer catalog so it renders immediately on the storefront
        onRefreshCatalog();

        // Reset form
        setNewProduct({
          title: '',
          category: 'electronics',
          subcategory: 'Smartwatches',
          price: '',
          compareAtPrice: '',
          stock: '25',
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
          description: '',
          tags: 'featured, new-arrival',
          featured: true,
        });
      } else {
        setProductCreateError(json.message || 'Failed to create product in PostgreSQL');
      }
    } catch (err: any) {
      console.error('[Admin Add Product Error]:', err);
      setProductCreateError(`Network or database error: ${err.message || 'Unknown'}`);
    } finally {
      setCreatingProduct(false);
    }
  };

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

    // Smooth scroll the content body to the top where the inspector card opens
    contentBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      contentBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);

    try {
      const res = await fetch(apiUrl(`/api/admin/analytics/customers/${customerId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCustomerDetail(json.data);
          contentBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (err) {
      console.error('[Admin Customer Detail Fetch Error]:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Fetch delivery agents
  const fetchAgents = async () => {
    if (!token) return;
    setLoadingAgents(true);
    try {
      const res = await fetch(apiUrl('/api/admin/agents'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAgents(json.data);
        }
      }
    } catch (err) {
      console.error('[Admin Agents Fetch Error]:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleToggleAgentActive = async (agentId: string, currentStatus: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/agents/${agentId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        setSaveMessage('Delivery agent status updated successfully!');
        setTimeout(() => setSaveMessage(null), 2500);
        await fetchAgents();
      }
    } catch (err) {
      console.error('Failed to update agent status:', err);
    }
  };

  const handleUpdateCommissionRate = async (agentId: string, rate: number) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/agents/${agentId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ commissionRate: rate }),
      });
      if (res.ok) {
        setSaveMessage('Commission rate updated in PostgreSQL!');
        setTimeout(() => setSaveMessage(null), 2500);
        await fetchAgents();
      }
    } catch (err) {
      console.error('Failed to update commission rate:', err);
    }
  };

  const handleAssignOrderAgent = async (orderId: string, agentId: string) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/orders/${orderId}/assign-agent`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId }),
      });
      if (res.ok) {
        setSaveMessage('Order agent assignment updated in PostgreSQL!');
        setTimeout(() => setSaveMessage(null), 2500);
        await fetchInventoryAndOrders();
      }
    } catch (err) {
      console.error('Failed to assign agent to order:', err);
    }
  };

  const handleConfirmQrPayment = async (orderId: string) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/orders/${orderId}/confirm-qr-payment`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSaveMessage('QR payment confirmed by Store Admin! Order marked settled.');
        setTimeout(() => setSaveMessage(null), 2500);
        await Promise.all([fetchInventoryAndOrders(), fetchAmountHandling(), fetchNotifications()]);
      }
    } catch (err) {
      console.error('Failed to confirm QR payment:', err);
    }
  };

  const handleRequestCashDeposit = async (orderId: string) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/orders/${orderId}/request-cash-deposit`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSaveMessage('Cash deposit requested from agent at Hyderabad store!');
        setTimeout(() => setSaveMessage(null), 2500);
        await Promise.all([fetchInventoryAndOrders(), fetchAmountHandling()]);
      }
    } catch (err) {
      console.error('Failed to request cash deposit:', err);
    }
  };

  const handleConfirmCashDeposited = async (orderId: string) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/orders/${orderId}/confirm-cash-deposited`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSaveMessage('Cash deposit confirmed at Hyderabad store! Delivery partner UNLOCKED.');
        setTimeout(() => setSaveMessage(null), 2500);
        await Promise.all([fetchInventoryAndOrders(), fetchAgents(), fetchAmountHandling(), fetchNotifications()]);
      }
    } catch (err) {
      console.error('Failed to confirm cash deposit:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/admin/notifications'), {
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
      // Ignore background notification fetch errors
    }
  };

  const handleMarkNotifRead = async (id: number | string) => {
    if (!token) return;
    try {
      await fetch(apiUrl(`/api/admin/notifications/${id}/read`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadNotifs(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllNotifsRead = async () => {
    if (!token) return;
    try {
      await fetch(apiUrl('/api/admin/notifications/mark-all-read'), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifs(0);
    } catch {}
  };

  const fetchAmountHandling = async () => {
    if (!token) return;
    setLoadingAmountSummary(true);
    try {
      const res = await fetch(apiUrl('/api/admin/amount-handling'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAmountSummary(json.data);
        }
      }
    } catch (err) {
      console.error('[Admin Amount Handling Fetch Error]:', err);
    } finally {
      setLoadingAmountSummary(false);
    }
  };

  const handleApproveAgentCashDeposit = async (agentId: string) => {
    if (!token) return;
    setApprovingDepositAgentId(agentId);
    try {
      const res = await fetch(apiUrl(`/api/admin/agents/${agentId}/approve-cash-deposit`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage(data.message || 'Cash deposit approved! Delivery partner unlocked.');
        setTimeout(() => setSaveMessage(null), 3500);
        await Promise.all([fetchAmountHandling(), fetchAgents(), fetchInventoryAndOrders(), fetchNotifications()]);
      } else {
        alert(data.message || 'Failed to approve cash deposit');
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setApprovingDepositAgentId(null);
    }
  };

  const handleRejectAgentCashDeposit = async () => {
    if (!token || !rejectModalAgent) return;
    setRejectingDeposit(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/agents/${rejectModalAgent.agentId}/reject-cash-deposit`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReasonInput || 'Cash deposit not received at Hyderabad store' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage('Store deposit rejected. Notification dispatched to Delivery Agent to resubmit.');
        setTimeout(() => setSaveMessage(null), 3500);
        setRejectModalAgent(null);
        setRejectionReasonInput('');
        await Promise.all([fetchAmountHandling(), fetchAgents(), fetchInventoryAndOrders(), fetchNotifications()]);
      } else {
        alert(data.message || 'Failed to reject cash deposit');
      }
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setRejectingDeposit(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newAgentName || !newAgentEmail) return;
    setCreatingAgent(true);
    try {
      const res = await fetch(apiUrl('/api/admin/agents'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newAgentName,
          email: newAgentEmail,
          phone: newAgentPhone,
          gender: newAgentGender,
          vehicleType: newAgentVehicle,
          deliveryZone: newAgentZone,
          commissionRate: parseFloat(newAgentRate) || 15.00,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const tempPassMsg = data.data?.tempPasswordSent ? ` (Temp Password: ${data.data.tempPasswordSent})` : '';
        setSaveMessage(`Delivery agent provisioned! Official onboarding email sent to ${newAgentEmail}${tempPassMsg}`);
        setShowAddAgentForm(false);
        setNewAgentName('');
        setNewAgentEmail('');
        setNewAgentPhone('');
        setTimeout(() => setSaveMessage(null), 4000);
        await fetchAgents();
      }
    } catch (err) {
      console.error('Failed to create agent:', err);
    } finally {
      setCreatingAgent(false);
    }
  };

  // Refresh all data
  const handleRefreshAll = async () => {
    await Promise.all([
      fetchAnalytics(),
      fetchInventoryAndOrders(),
      fetchAgents(),
      fetchNotifications(),
      fetchAmountHandling(),
    ]);
  };

  useEffect(() => {
    if (isOpen) {
      handleRefreshAll();
    } else {
      setSelectedCustomerId(null);
      setCustomerDetail(null);
      setShowNotifDropdown(false);
    }
  }, [isOpen, token]);

  // Real-time polling for notifications and amount handling
  useEffect(() => {
    if (!isOpen || !token) return;
    const interval = setInterval(() => {
      fetchNotifications();
      if (activeTab === 'amount-handling') {
        fetchAmountHandling();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isOpen, token, activeTab]);

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
    <>
      <div
        data-test="admin-modal"
      data-testid="admin-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[94vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Navbar Row 1: Title & Action Tools (Exit button always visible) */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800 shrink-0 relative z-20 min-h-[68px]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shadow-inner shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">ShopSphere Administrator Console</h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Role: {user?.role || 'Admin'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PostgreSQL 18
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Logged in as <strong className="text-white">{user?.name}</strong> ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                data-test="admin-notifications-bell"
                data-testid="admin-notifications-bell"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                title="Notifications & Alerts"
                className="relative w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
                  <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-indigo-400" />
                      Alerts &amp; Notifications ({unreadNotifs} unread)
                    </span>
                    {unreadNotifs > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotifsRead}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">No notifications yet</div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => !n.isRead && handleMarkNotifRead(n.id)}
                          className={`p-3 transition-colors cursor-pointer ${
                            n.isRead ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-800/60 text-slate-200'
                          } hover:bg-slate-800`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-white">{n.title}</span>
                            {n.amount && (
                              <span className="font-mono text-emerald-400 font-extrabold text-[11px]">
                                ₹{Number(n.amount).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5">{n.message}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {!n.isRead && <span className="text-rose-400 font-bold">● New</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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
              title="Exit Admin Console"
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Navbar Row 2: Full-Width Primary Navigation Tabs Bar */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-950 border-b border-slate-800 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              data-test="admin-tab-overview"
              data-testid="admin-tab-overview"
              onClick={() => {
                setActiveTab('overview');
                setSelectedCustomerId(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs ${
                activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Overview &amp; Analytics</span>
            </button>
            <button
              data-test="admin-tab-analytics"
              data-testid="admin-tab-analytics"
              onClick={() => {
                setActiveTab('analytics');
                setSelectedCustomerId(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-xs ${
                activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="hidden sm:inline">Customer </span>Activity ({customers.length})
            </button>
            <button
              data-test="admin-tab-inventory"
              data-testid="admin-tab-inventory"
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-xs ${
                activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Inventory ({products.length})
            </button>
            <button
              data-test="admin-tab-add-product"
              data-testid="admin-tab-add-product"
              onClick={() => setActiveTab('add-product')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 text-xs ${
                activeTab === 'add-product' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
            <button
              data-test="admin-tab-orders"
              data-testid="admin-tab-orders"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap text-xs ${
                activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="hidden sm:inline">Global </span>Orders ({orders.length})
            </button>
            <button
              data-test="admin-tab-agents"
              data-testid="admin-tab-agents"
              onClick={() => setActiveTab('agents')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 text-xs ${
                activeTab === 'agents' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Delivery Agents ({agents.length})</span>
            </button>
            <button
              data-test="admin-tab-amount-handling"
              data-testid="admin-tab-amount-handling"
              onClick={() => setActiveTab('amount-handling')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs ${
                activeTab === 'amount-handling' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Amount Handling</span>
              {(((amountSummary?.depositApprovalAgents?.length || 0) + (amountSummary?.qrPendingOrders?.length || 0)) > 0) && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                  {(amountSummary?.depositApprovalAgents?.length || 0) + (amountSummary?.qrPendingOrders?.length || 0)}
                </span>
              )}
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
        <div ref={contentBodyRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* =========================================================================
              SECTION 0: EXECUTIVE OVERVIEW & PLATFORM ANALYTICS
             ========================================================================= */}
          {activeTab === 'overview' && token && (
            <div className="space-y-6">
              <ChartErrorBoundary fallbackTitle="Admin Executive Dashboard Unavailable">
                <AdminOverviewDashboard token={token} />
              </ChartErrorBoundary>
            </div>
          )}

          {/* =========================================================================
              SECTION 3: CUSTOMER ACTIVITY & ANALYTICS TAB
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
                    {(() => {
                      const customerObj = customerDetail?.customer || (customerDetail as any)?.profile;
                      return (
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md overflow-hidden">
                            {customerObj?.avatar ? (
                              <img src={customerObj.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              customerObj?.name?.charAt(0) || 'C'
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-extrabold text-slate-900">
                                {customerObj?.name || 'Loading Customer Details...'}
                              </h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                                {customerObj?.id || selectedCustomerId}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {customerObj?.email} {customerObj?.phone ? `• ${customerObj.phone}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

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
                          Orders ({customerDetail?.orders?.length ?? 0})
                        </button>
                        <button
                          data-test="customer-detail-tab-cart"
                          data-testid="customer-detail-tab-cart"
                          onClick={() => setDetailTab('cart')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            detailTab === 'cart' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Cart Items ({customerDetail?.cartItems?.length ?? 0})
                        </button>
                        <button
                          data-test="customer-detail-tab-wishlist"
                          data-testid="customer-detail-tab-wishlist"
                          onClick={() => setDetailTab('wishlist')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            detailTab === 'wishlist' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Wishlist ({customerDetail?.wishlistItems?.length ?? 0})
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
                          {customerDetail && (customerDetail.orders?.length ?? 0) > 0 ? (
                            (customerDetail.orders ?? []).map(order => (
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
                                {order.paymentStatus === 'paid_to_delivery_agent' && (
                                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                                    <span className="font-bold text-amber-800 flex items-center gap-1">
                                      ⚠️ Customer marked Paid to Delivery Boy (Cash/UPI)
                                    </span>
                                    <button
                                      type="button"
                                      disabled={updatingOrderId === String(order.id) || updatingOrderId === order.orderNumber}
                                      onClick={() => handleUpdateOrderStatus(order.orderNumber, 'delivered')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-xs cursor-pointer transition-colors"
                                      title="Verify payment and approve as delivered"
                                    >
                                      Approve &amp; Mark Delivered
                                    </button>
                                  </div>
                                )}

                                {/* Order Line Items */}
                                <div className="space-y-1.5 pt-1">
                                  {(order.items ?? []).map(item => (
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
                          {customerDetail && (customerDetail.cartItems?.length ?? 0) > 0 ? (
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
                                  {(customerDetail.cartItems ?? []).map(item => (
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
                          {customerDetail && (customerDetail.wishlistItems?.length ?? 0) > 0 ? (
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
                                  {(customerDetail.wishlistItems ?? []).map(item => (
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
                                      <td className="p-3 font-semibold text-slate-700 capitalize">{item.category}</td>
                                      <td className="p-3 font-extrabold text-indigo-700">${item.price.toFixed(2)}</td>
                                      <td className="p-3 text-slate-400 text-[11px]">{new Date(item.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                              No saved products in this customer&apos;s wishlist.
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
                              onClick={() => {
                                if (selectedCustomerId === cust.id) {
                                  // If already selected, scroll smoothly up to the panel
                                  contentBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                } else {
                                  fetchCustomerDetail(cust.id);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs ${
                                selectedCustomerId === cust.id
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{selectedCustomerId === cust.id ? 'Inspecting ↑' : 'Inspect Activity'}</span>
                            </button>

                            <button
                              type="button"
                              data-test={`btn-view-customer-analytics-${cust.id}`}
                              data-testid={`btn-view-customer-analytics-${cust.id}`}
                              onClick={() => {
                                setAnalyticsModalUser({ id: cust.id, type: 'customer' });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-all cursor-pointer shadow-2xs ml-1.5 border border-indigo-200/60"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                              <span>View Analytics</span>
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-test="admin-add-product-btn"
                    data-testid="admin-add-product-btn"
                    onClick={() => setActiveTab('add-product')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add New Product</span>
                  </button>

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
              SECTION 4.5: ADD PRODUCT FORM TAB
             ========================================================================= */}
          {activeTab === 'add-product' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Header Banner */}
              <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl text-white flex flex-wrap items-center justify-between gap-3 shadow-sm border border-indigo-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-indigo-300 border border-white/10">
                    <PlusCircle className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      Add New Product to Catalog
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        PostgreSQL Sync
                      </span>
                    </h3>
                    <p className="text-xs text-indigo-200">
                      Creates a new storefront item with real-time database persistence and instant customer catalog sync.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-test="btn-auto-fill-product"
                    data-testid="btn-auto-fill-product"
                    onClick={() => handleAutoFillSample()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer shadow-xs"
                    title="Quickly fill sample product for fast QA testing"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>⚡ Auto-Fill Sample</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    View Inventory
                  </button>
                </div>
              </div>

              {/* Sample Preset Quick-Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" /> Quick Presets:
                </span>
                {sampleProductPresets.map((preset, idx) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handleAutoFillSample(idx)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 text-[11px] font-medium transition-all cursor-pointer"
                  >
                    {preset.category === 'electronics' ? '⌚' : preset.category === 'audio' ? '🎧' : preset.category === 'fashion' ? '🧥' : '✨'} {preset.subcategory}
                  </button>
                ))}
              </div>

              {/* Error and Success Alerts */}
              {productCreateError && (
                <div
                  data-test="product-create-error"
                  data-testid="product-create-error"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{productCreateError}</span>
                </div>
              )}

              {productCreateSuccess && (
                <div
                  data-test="product-create-success"
                  data-testid="product-create-success"
                  className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{productCreateSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className="text-xs text-emerald-700 underline font-extrabold hover:text-emerald-900 cursor-pointer"
                  >
                    View in Inventory →
                  </button>
                </div>
              )}

              {/* Product Creation Form */}
              <form onSubmit={handleCreateProduct} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Product Name / Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      data-test="add-product-title"
                      data-testid="add-product-title"
                      placeholder="e.g. Samsung Galaxy Watch 8 Pro (46mm, Bluetooth)"
                      value={newProduct.title}
                      onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      data-test="add-product-category"
                      data-testid="add-product-category"
                      value={newProduct.category}
                      onChange={e => setNewProduct({ ...newProduct, category: e.target.value as ProductCategory })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white cursor-pointer"
                    >
                      <option value="electronics">Electronics</option>
                      <option value="fashion">Fashion</option>
                      <option value="audio">Audio</option>
                      <option value="beauty">Beauty</option>
                    </select>
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subcategory / Department
                    </label>
                    <input
                      type="text"
                      data-test="add-product-subcategory"
                      data-testid="add-product-subcategory"
                      placeholder="e.g. Smartwatches, Over-Ear, Outerwear"
                      value={newProduct.subcategory}
                      onChange={e => setNewProduct({ ...newProduct, subcategory: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sale Price ($) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      data-test="add-product-price"
                      data-testid="add-product-price"
                      placeholder="e.g. 249.99"
                      value={newProduct.price}
                      onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Compare At Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Original / Compare-At Price ($) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      data-test="add-product-compare-price"
                      data-testid="add-product-compare-price"
                      placeholder="e.g. 299.99 (Strikethrough discount)"
                      value={newProduct.compareAtPrice}
                      onChange={e => setNewProduct({ ...newProduct, compareAtPrice: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Initial Stock Units */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Stock Units
                    </label>
                    <input
                      type="number"
                      min="1"
                      data-test="add-product-stock"
                      data-testid="add-product-stock"
                      placeholder="e.g. 25"
                      value={newProduct.stock}
                      onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Featured Flag */}
                  <div className="flex items-center gap-2 pt-6">
                    <label className="relative flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        data-test="add-product-featured"
                        data-testid="add-product-featured"
                        checked={newProduct.featured}
                        onChange={e => setNewProduct({ ...newProduct, featured: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span>Feature on Storefront Homepage</span>
                    </label>
                  </div>

                  {/* Image URL with live preview */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Product Image URL
                    </label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="url"
                        data-test="add-product-image"
                        data-testid="add-product-image"
                        placeholder="https://images.unsplash.com/..."
                        value={newProduct.imageUrl}
                        onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                      {newProduct.imageUrl && (
                        <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={newProduct.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      data-test="add-product-description"
                      data-testid="add-product-description"
                      placeholder="Detailed product specifications, materials, warranty, and features..."
                      value={newProduct.description}
                      onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>

                  {/* Search Tags */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tags <span className="text-slate-400 font-normal">(Comma separated)</span>
                    </label>
                    <input
                      type="text"
                      data-test="add-product-tags"
                      data-testid="add-product-tags"
                      placeholder="e.g. smartwatch, fitness, titanium, waterproof"
                      value={newProduct.tags}
                      onChange={e => setNewProduct({ ...newProduct, tags: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-400">
                    Product will be persisted to PostgreSQL database and immediately available for storefront customers.
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewProduct({
                          title: '',
                          category: 'electronics',
                          subcategory: 'Smartwatches',
                          price: '',
                          compareAtPrice: '',
                          stock: '25',
                          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
                          description: '',
                          tags: 'featured, new-arrival',
                          featured: true,
                        });
                        setProductCreateError(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={creatingProduct}
                      data-test="admin-submit-product-btn"
                      data-testid="admin-submit-product-btn"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {creatingProduct ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving to PostgreSQL...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          <span>Create &amp; Publish Product</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================================
              SECTION 5: GLOBAL ORDERS TAB
             ========================================================================= */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl overflow-x-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-200 min-w-[750px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Order Number</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Destination</th>
                      <th className="p-3">Payment &amp; Settlement</th>
                      <th className="p-3">Grand Total</th>
                      <th className="p-3">Assigned Agent (FIFO)</th>
                      <th className="p-3">Live Tracking</th>
                      <th className="p-3">Status &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {orders.map(o => (
                      <React.Fragment key={o.id}>
                        <tr
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
                            <div className="space-y-1">
                              <span className="uppercase font-semibold text-slate-700">
                                {o.paymentMode || o.paymentMethod}
                              </span>
                              {o.paymentSettlementStatus && o.paymentSettlementStatus !== 'PENDING_DELIVERY' && (
                                <div>
                                  {o.paymentSettlementStatus === 'QR_PAID_AWAITING_ADMIN' && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                        ⏳ UPI Paid (Verify)
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmQrPayment(o.orderNumber || o.id)}
                                        className="block px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        ✓ Mark QR Received
                                      </button>
                                    </div>
                                  )}
                                  {o.paymentSettlementStatus === 'CASH_COLLECTED_BY_AGENT' && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                        💵 Cash with Agent (Locked)
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRequestCashDeposit(o.orderNumber || o.id)}
                                        className="block px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        Deposit Cash at Store
                                      </button>
                                    </div>
                                  )}
                                  {o.paymentSettlementStatus === 'CASH_DEPOSIT_REQUESTED' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                                      🏦 Deposit Requested
                                    </span>
                                  )}
                                  {o.paymentSettlementStatus === 'CASH_DEPOSITED_AT_STORE' && (
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">
                                        🏦 Cash at Store
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmCashDeposited(o.orderNumber || o.id)}
                                        className="block px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        ✓ Confirm Cash (Unlock Agent)
                                      </button>
                                    </div>
                                  )}
                                  {(o.paymentSettlementStatus === 'QR_AMOUNT_RECEIVED' ||
                                    o.paymentSettlementStatus === 'SETTLED') && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      ✓ Settled &amp; Cleared
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-bold text-slate-900">₹{o.grandTotal.toFixed(2)}</td>
                          <td className="p-3">
                            <select
                              data-test={`admin-order-agent-select-${o.orderNumber}`}
                              data-testid={`admin-order-agent-select-${o.orderNumber}`}
                              value={o.assignedAgentId || ''}
                              onChange={e => handleAssignOrderAgent(o.orderNumber || o.id, e.target.value)}
                              className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 outline-none cursor-pointer max-w-[150px]"
                              title="Reassign order to delivery agent"
                            >
                              <option value="">Unassigned</option>
                              {agents.map(ag => (
                                <option key={ag.id} value={ag.id}>
                                  {ag.isLoggedIn ? '🟢 ' : '⚪ '}
                                  {ag.name} ({ag.vehicleType})
                                </option>
                              ))}
                            </select>
                            {o.assignmentStatus && (
                              <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">
                                {o.assignmentStatus}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() =>
                                setViewMapOrderId(viewMapOrderId === o.orderNumber ? null : o.orderNumber)
                              }
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                                viewMapOrderId === o.orderNumber
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                              }`}
                            >
                              <Truck className="w-3 h-3" />
                              <span>{viewMapOrderId === o.orderNumber ? 'Hide Map' : 'View Route'}</span>
                            </button>
                          </td>
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

                        {/* Expandable Live Route Map Drawer */}
                        {viewMapOrderId === o.orderNumber && (
                          <tr>
                            <td colSpan={8} className="p-4 bg-slate-50 border-b border-indigo-100">
                              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-800">
                                    🗺️ Real-Time Delivery Route for Order {o.orderNumber}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-slate-500 text-[11px]">
                                      Origin: Hyderabad Store (Hitech City) ➔ Destination: {o.shippingAddress.street},{' '}
                                      {o.shippingAddress.city}
                                    </span>
                                    <button
                                      type="button"
                                      data-test={`btn-close-map-${o.orderNumber}`}
                                      data-testid={`btn-close-map-${o.orderNumber}`}
                                      onClick={() => setViewMapOrderId(null)}
                                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                      title="Close route map"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <LiveRouteMap
                                  destinationLat={o.deliveryLat || 17.4375}
                                  destinationLng={o.deliveryLng || 78.4482}
                                  customerAddress={`${o.shippingAddress.street}, ${o.shippingAddress.city}`}
                                  orderStatus={o.orderStatus}
                                  assignedAgentName={o.assignedAgentName}
                                  assignedAgentPhone={o.assignedAgentPhone}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 6: DELIVERY AGENTS MANAGEMENT TAB
             ========================================================================= */}
          {activeTab === 'agents' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Hyderabad Delivery Fleet &amp; FIFO Queue Monitor 🇮🇳
                  </h4>
                  <p className="text-xs text-slate-500">
                    Active online status, FIFO queue rank, cash store-deposit lockouts, and payout rates
                  </p>
                </div>
                <button
                  type="button"
                  data-test="btn-toggle-add-agent"
                  data-testid="btn-toggle-add-agent"
                  onClick={() => setShowAddAgentForm(!showAddAgentForm)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{showAddAgentForm ? 'Close Form' : 'Provision New Agent'}</span>
                </button>
              </div>

              {/* Add Agent Form */}
              {showAddAgentForm && (
                <form
                  onSubmit={handleCreateAgent}
                  className="p-4 bg-white border border-indigo-200 rounded-2xl shadow-sm space-y-3"
                >
                  <h5 className="text-xs font-bold text-indigo-900 uppercase">Provision New Hyderabad Delivery Partner</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newAgentName}
                        onChange={e => setNewAgentName(e.target.value)}
                        placeholder="Ramesh Reddy"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={newAgentEmail}
                        onChange={e => setNewAgentEmail(e.target.value)}
                        placeholder="ramesh@shopsphere.test"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phone (+91 🇮🇳)</label>
                      <input
                        type="tel"
                        value={newAgentPhone}
                        onChange={e => setNewAgentPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Gender</label>
                      <select
                        value={newAgentGender}
                        onChange={e => setNewAgentGender(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non_binary">Non-Binary</option>
                        <option value="prefer_not_to_say">Prefer Not to Say</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Vehicle</label>
                      <select
                        value={newAgentVehicle}
                        onChange={e => setNewAgentVehicle(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Electric Scooter">Electric Scooter</option>
                        <option value="Bicycle">Bicycle</option>
                        <option value="Car">Car</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Delivery Zone</label>
                      <select
                        value={newAgentZone}
                        onChange={e => setNewAgentZone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="Hitech City, Hyderabad">Hitech City, Hyderabad</option>
                        <option value="Madhapur, Hyderabad">Madhapur, Hyderabad</option>
                        <option value="Gachibowli, Hyderabad">Gachibowli, Hyderabad</option>
                        <option value="Jubilee Hills, Hyderabad">Jubilee Hills, Hyderabad</option>
                        <option value="Banjara Hills, Hyderabad">Banjara Hills, Hyderabad</option>
                        <option value="Kukatpally, Hyderabad">Kukatpally, Hyderabad</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Payout (₹/Order)</label>
                      <input
                        type="number"
                        step="10"
                        value={newAgentRate}
                        onChange={e => setNewAgentRate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={creatingAgent}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {creatingAgent ? 'Creating...' : 'Confirm & Save Agent'}
                    </button>
                  </div>
                </form>
              )}

              {/* Agents Table */}
              <div className="border border-slate-200 rounded-2xl overflow-x-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-200 min-w-[750px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Agent</th>
                      <th className="p-3">Online &amp; FIFO Rank</th>
                      <th className="p-3">Contact &amp; Zone</th>
                      <th className="p-3">Cash Lock Status</th>
                      <th className="p-3">Payout Rate</th>
                      <th className="p-3">Earnings</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {agents.map(ag => (
                      <tr
                        key={ag.id}
                        data-test={`admin-agent-row-${ag.id}`}
                        data-testid={`admin-agent-row-${ag.id}`}
                        className="hover:bg-slate-50/50"
                      >
                        <td className="p-3 flex items-center gap-2.5">
                          <img
                            src={ag.avatarUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{ag.name}</p>
                            <span className="font-mono text-[10px] text-slate-400">{ag.agentCode}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {ag.isLoggedIn ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              🟢 Online (Rank #{ag.fifoRank || 1})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              ⚪ Offline
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          <p>{ag.email}</p>
                          <p className="text-[10px] text-slate-400">{ag.phone || '+91 98765 43210'}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{ag.deliveryZone}</p>
                        </td>
                        <td className="p-3">
                          {ag.hasPendingCashDeposit ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              🔒 LOCKED (₹{(ag.pendingCashAmount || 0).toFixed(2)} cash pending)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✅ Unlocked (Active Queue)
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                            <span>₹</span>
                            <input
                              type="number"
                              defaultValue={ag.commissionRate || 150}
                              onBlur={e => handleUpdateCommissionRate(ag.id, parseFloat(e.target.value))}
                              className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-slate-50"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-mono font-bold text-emerald-700">₹{ag.totalEarnings.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-400">{ag.deliveredOrdersCount} delivered</p>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            data-test={`btn-view-agent-analytics-${ag.id}`}
                            data-testid={`btn-view-agent-analytics-${ag.id}`}
                            onClick={() => {
                              setAnalyticsModalUser({ id: ag.id, type: 'agent' });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer mr-1.5 border border-blue-200"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>View Analytics</span>
                          </button>

                          <button
                            type="button"
                            data-test={`btn-toggle-agent-status-${ag.id}`}
                            data-testid={`btn-toggle-agent-status-${ag.id}`}
                            onClick={() => handleToggleAgentActive(ag.id, ag.isActive)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              ag.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {ag.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: AMOUNT COLLECTION & CASH HANDLING DASHBOARD */}
          {activeTab === 'amount-handling' && (
            <div className="space-y-6">
              {/* Header & Refresh */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <span>Amount Collection &amp; Cash Handling Console</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dual COD settlement reconciliation: Verify UPI QR bank receipts and approve Hyderabad Store physical cash deposits to unlock agents into the active FIFO queue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchAmountHandling}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Queue</span>
                </button>
              </div>

              {/* 3 Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* UPI QR Metric */}
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                  <div className="flex items-center justify-between text-indigo-900 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">UPI QR Collections</span>
                    <QrCode className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-extrabold text-indigo-950 font-mono">
                    ₹{(amountSummary?.upiQrConfirmed || 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-indigo-700 mt-1 flex items-center justify-between">
                    <span>Awaiting Admin Verification:</span>
                    <strong className="font-mono text-amber-700">
                      ₹{(amountSummary?.upiQrAwaitingAdmin || 0).toFixed(2)} ({amountSummary?.qrPendingOrders?.length || 0})
                    </strong>
                  </div>
                </div>

                {/* Cash Handling Metric */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                  <div className="flex items-center justify-between text-amber-900 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Cash in Hand / Store</span>
                    <Banknote className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-extrabold text-amber-950 font-mono">
                    ₹{(amountSummary?.cashApprovedAtStore || 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-amber-800 mt-1 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Submitted Deposit Awaiting Approval:</span>
                      <strong className="font-mono text-indigo-700">₹{(amountSummary?.cashSubmittedAwaitingApproval || 0).toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Cash Held by Active Agents:</span>
                      <strong className="font-mono text-rose-700">₹{(amountSummary?.cashHeldByAgents || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* Grand Total Revenue Metric */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between text-emerald-900 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Reconciled COD</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-extrabold text-emerald-950 font-mono">
                    ₹{(amountSummary?.grandTotalCodRevenue || 0).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-1 flex items-center justify-between">
                    <span>Total In-Flight / Unsettled:</span>
                    <strong className="font-mono text-slate-700">
                      ₹{(((amountSummary?.upiQrAwaitingAdmin || 0) + (amountSummary?.cashSubmittedAwaitingApproval || 0) + (amountSummary?.cashHeldByAgents || 0))).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Section 1: Store Cash Deposit Approval Queue (Priority!) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Store Cash Deposit Approvals &amp; Agent Queue Unlocks</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {amountSummary?.depositApprovalAgents?.length || 0} Agents
                    </span>
                  </h4>
                </div>

                {(!amountSummary?.depositApprovalAgents || amountSummary.depositApprovalAgents.length === 0) ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">All Agent Cash Collections Settled</p>
                    <p className="text-[11px] mt-0.5">No delivery agents currently locked with pending physical cash deposits.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {amountSummary.depositApprovalAgents.map(agentItem => (
                      <div
                        key={agentItem.agentId}
                        className={`p-4 rounded-2xl border transition-all ${
                          agentItem.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL'
                            ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                            : agentItem.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED'
                            ? 'bg-rose-50/60 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={agentItem.avatarUrl}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm">{agentItem.agentName}</p>
                              <p className="text-[11px] font-mono text-slate-500">{agentItem.agentCode} • {agentItem.agentPhone}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-slate-500">Cash to Deposit</div>
                            <div className="font-mono text-base font-extrabold text-rose-700">
                              ₹{(agentItem.pendingCashAmount || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Status Alert Banner */}
                        <div className="mt-3">
                          {agentItem.cashDepositStatus === 'DEPOSIT_SUBMITTED_FOR_APPROVAL' ? (
                            <div className="p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                                Deposit Submitted at Store Counter
                              </span>
                              <span className="font-mono text-[10px] bg-amber-200 px-1.5 py-0.5 rounded font-bold">
                                Action Needed
                              </span>
                            </div>
                          ) : agentItem.cashDepositStatus === 'REJECTED_RESUBMIT_REQUIRED' ? (
                            <div className="p-2.5 bg-rose-100/80 border border-rose-300 rounded-xl text-xs text-rose-950">
                              <p className="font-bold">❌ Rejected — Awaiting Agent Re-submission</p>
                              <p className="text-[11px] text-rose-800 mt-0.5">Reason: {agentItem.depositRejectionReason || 'Cash mismatch'}</p>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
                              <span className="font-bold">🔒 Locked — Cash In Hand</span>
                              <span className="text-[10px] text-slate-500">Agent must deposit at store</span>
                            </div>
                          )}
                        </div>

                        {/* Linked Orders List */}
                        {agentItem.linkedOrders && agentItem.linkedOrders.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200/80 text-[11px] space-y-1">
                            <div className="font-bold text-slate-600 uppercase text-[10px]">Linked Delivered Orders:</div>
                            {agentItem.linkedOrders.map(o => (
                              <div key={o.orderNumber} className="flex justify-between items-center text-slate-700">
                                <span className="font-mono font-bold">#{o.orderNumber}</span>
                                <span className="font-mono font-bold text-slate-900">₹{Number(o.grandTotal).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
                          <button
                            type="button"
                            disabled={approvingDepositAgentId === agentItem.agentId}
                            onClick={() => handleApproveAgentCashDeposit(agentItem.agentId)}
                            data-test={`btn-approve-deposit-${agentItem.agentId}`}
                            data-testid={`btn-approve-deposit-${agentItem.agentId}`}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {approvingDepositAgentId === agentItem.agentId ? 'Approving...' : 'Approve Deposit (Unlock Agent)'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalAgent(agentItem);
                              setRejectionReasonInput('');
                            }}
                            data-test={`btn-reject-deposit-${agentItem.agentId}`}
                            data-testid={`btn-reject-deposit-${agentItem.agentId}`}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: UPI QR Verification Queue */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>UPI QR Payment Verification Queue</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {amountSummary?.qrPendingOrders?.length || 0} Orders
                    </span>
                  </h4>
                </div>

                {(!amountSummary?.qrPendingOrders || amountSummary.qrPendingOrders.length === 0) ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No Pending UPI QR Payments</p>
                    <p className="text-[11px] mt-0.5">All customer UPI QR transactions have been verified by Store Admin.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-x-auto text-xs">
                    <table className="w-full text-left divide-y divide-slate-200 min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Order #</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Delivery Agent</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Scanned / Paid At</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {amountSummary.qrPendingOrders.map(order => (
                          <tr key={order.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-indigo-600">
                              #{order.orderNumber}
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{order.userName}</p>
                              <p className="text-[10px] text-slate-500">{order.userEmail}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-slate-800">{order.assignedAgentName || 'Agent'}</p>
                              <span className="text-[10px] font-mono text-slate-400">ID: {order.assignedAgentId}</span>
                            </td>
                            <td className="p-3 font-mono font-extrabold text-slate-900">
                              ₹{Number(order.grandTotal).toFixed(2)}
                            </td>
                            <td className="p-3 text-slate-500 text-[11px]">
                              {order.depositSubmittedAt || order.deliveredAt ? new Date(order.depositSubmittedAt || order.deliveredAt || '').toLocaleString() : 'Just now'}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleConfirmQrPayment(order.id)}
                                data-test={`btn-confirm-qr-${order.orderNumber}`}
                                data-testid={`btn-confirm-qr-${order.orderNumber}`}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm ₹{Number(order.grandTotal).toFixed(2)} Received</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Deposit Rejection Modal Dialog */}
      {rejectModalAgent && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reject Store Cash Deposit</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalAgent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Agent: <strong>{rejectModalAgent.agentName}</strong> ({rejectModalAgent.agentCode})
              </p>
              <p>
                Pending Cash Amount: <strong className="font-mono text-rose-600">₹{(rejectModalAgent.pendingCashAmount || 0).toFixed(2)}</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Rejecting will keep the delivery agent locked and send them an instant in-app notification with your reason.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Rejection Reason / Note to Agent
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={e => setRejectionReasonInput(e.target.value)}
                  data-test="input-deposit-rejection-reason"
                  data-testid="input-deposit-rejection-reason"
                  placeholder="e.g. Short of ₹200 at store counter, counterfeit note detected, or deposit slip mismatch."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRejectModalAgent(null)}
                data-test="btn-cancel-deposit-rejection"
                data-testid="btn-cancel-deposit-rejection"
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectingDeposit}
                onClick={handleRejectAgentCashDeposit}
                data-test="btn-confirm-deposit-rejection"
                data-testid="btn-confirm-deposit-rejection"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {rejectingDeposit ? 'Rejecting...' : 'Confirm Rejection & Keep Agent Locked'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Analytics Profile Modal (Customer or Agent Dossier) */}
      {analyticsModalUser && token && (
        <ChartErrorBoundary fallbackTitle="User Dossier Analytics Unavailable">
          <UserAnalyticsModal
            isOpen={Boolean(analyticsModalUser)}
            onClose={() => setAnalyticsModalUser(null)}
            userId={analyticsModalUser.id}
            userType={analyticsModalUser.type}
            token={token}
          />
        </ChartErrorBoundary>
      )}
    </>
  );
};
