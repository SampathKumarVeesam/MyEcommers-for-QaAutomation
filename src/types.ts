export type Role = 'admin' | 'customer' | 'delivery_agent';

export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  gender?: Gender;
  phone?: string;
  avatar?: string;
  avatarUrl?: string;
  address?: Address;
  provider?: 'local' | 'google' | 'apple' | string;
  providerId?: string;
  createdAt: string;
}

export interface DeliveryAgent {
  id: string;
  agentCode: string;
  name: string;
  email: string;
  phone?: string;
  gender: Gender;
  avatarUrl: string;
  role: 'delivery_agent';
  vehicleType: string;
  deliveryZone: string;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
  isLoggedIn?: boolean;
  lastActiveAt?: string;
  fifoQueueJoinedAt?: string;
  hasPendingCashDeposit?: boolean;
  pendingCashAmount?: number;
  cashDepositStatus?: 'NONE' | 'PENDING_STORE_DEPOSIT' | 'DEPOSIT_SUBMITTED_FOR_APPROVAL' | 'REJECTED_RESUBMIT_REQUIRED' | 'APPROVED';
  depositRejectionReason?: string | null;
  currentLat?: number;
  currentLng?: number;
  fifoRank?: number;
  commissionRate: number;
  totalEarnings: number;
  deliveredOrdersCount: number;
  createdAt: string;
  updatedAt: string;
}

export const STORE_ORIGIN = {
  name: 'ShopSphere Hyderabad Flagship Store',
  address: 'Plot 12, Mindspace Madhapur, Hitech City, Hyderabad, Telangana 500081',
  phone: '+91 40 6789 0100',
  lat: 17.4486,
  lng: 78.3908,
};

export interface Address {
  fullName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  lat?: number;
  lng?: number;
}

export type ProductCategory = 'fashion' | 'electronics' | 'audio' | 'beauty';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Size: M, Color: Emerald" or "Storage: 256GB, Color: Titanium"
  sku: string;
  priceDelta: number;
  stock: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: ProductCategory;
  subcategory: string; // e.g. "Dresses", "Smartphones", "Earbuds", "Perfumes"
  price: number;
  compareAtPrice?: number;
  stock: number;
  rating: number;
  reviewsCount: number;
  images: string[];
  description: string;
  tags: string[];
  specifications: Record<string, string>;
  variants?: ProductVariant[];
  colorOptions?: { name: string; hex: string }[];
  sizeOptions?: string[];
  scentNotes?: {
    top: string[];
    heart: string[];
    base: string[];
  };
  featured?: boolean;
}

export interface BasketItem {
  id: string;
  productId: string;
  productCode?: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedVariant?: string;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Basket {
  id: string;
  userId?: string;
  items: BasketItem[];
  totalItemCount: number;
  subtotal: number;
  estimatedTax: number;
  shippingFee: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'upi' | 'credit_card' | 'net_banking' | 'cod';

export type OrderStatus = 'pending' | 'processing' | 'processed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  basketId: string;
  items: BasketItem[];
  shippingAddress: Address;
  shippingMethod: 'standard' | 'express' | 'priority';
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'pending' | 'cod_pending' | 'paid_to_delivery_agent';
  orderStatus: OrderStatus;
  subtotal: number;
  tax: number;
  shippingFee: number;
  grandTotal: number;
  trackingNumber: string;
  createdAt: string;
  assignedAgentId?: string | number | null;
  assignedAgent?: DeliveryAgent | null;
  assignedAgentName?: string | null;
  assignedAgentPhone?: string | null;
  assignmentStatus?: 'UNASSIGNED' | 'PENDING_ACCEPTANCE' | 'ACCEPTED';
  assignedAt?: string | null;
  acceptanceDeadline?: string | null;
  rejectedOrExpiredAgentIds?: string[];
  paymentMode?: 'PREPAID' | 'COD';
  codCollectionMethod?: 'CASH' | 'UPI_QR' | null;
  paymentSettlementStatus?: 'PAID_ONLINE' | 'QR_PAID_AWAITING_ADMIN' | 'QR_AMOUNT_RECEIVED' | 'CASH_COLLECTED_BY_AGENT' | 'CASH_DEPOSIT_REQUESTED' | 'CASH_DEPOSITED_AT_STORE' | 'SETTLED' | string;
  deliveryLat?: number;
  deliveryLng?: number;
  customerLat?: number;
  customerLng?: number;
  agentLat?: number;
  agentLng?: number;
  locationUpdatedAt?: string | null;
  orderProceededAt?: string | null;
  estimatedDurationSeconds?: number;
  estimatedDeliveryAt?: string | null;
  isDelayed?: boolean;
  delayStartedAt?: string | null;
  extraDelaySeconds?: number;
  transferReason?: string | null;
  transferredFromAgentName?: string | null;
  transferredFromAgentId?: string | null;
  assignmentTier?: 'IDLE_NEAREST' | 'BUSY_NEAREST' | null;
  deliveryFee?: number;
  codPaymentMethod?: 'cash' | 'upi' | null;
  codPaymentStatus?: 'pending' | 'paid' | null;
  deliveryOtp?: string | null;
  otpVerified?: boolean;
  deliveredAt?: string | null;
  depositSubmittedAt?: string | null;
  depositVerifiedAt?: string | null;
  depositRejectionNote?: string | null;
  feedbackStatus?: 'pending' | 'submitted' | 'dismissed_forever';
  nextFeedbackReminderAt?: string | null;
}

export interface OrderTransfer {
  id: number;
  orderId: number | string;
  fromAgentId: string | null;
  fromAgentName?: string | null;
  toAgentId: string | null;
  toAgentName?: string | null;
  assignmentTier?: 'IDLE_NEAREST' | 'BUSY_NEAREST';
  transferReason: string;
  handoffLat?: number | null;
  handoffLng?: number | null;
  transferredAt: string;
}

export interface AgentContactLog {
  id: number;
  orderId: number | string;
  customerId?: string | null;
  customerName?: string | null;
  agentId: string;
  agentName?: string | null;
  contactChannel: 'CALL' | 'WHATSAPP' | 'IN_APP_CHAT';
  contactedAt: string;
}

export interface OrderTrackingInfo {
  order_id: string | number;
  order_number: string;
  status: OrderStatus;
  server_now: string;
  order_proceeded_at: string | null;
  estimated_duration_seconds: number;
  estimated_delivery_at: string | null;
  is_delayed: boolean;
  delay_started_at: string | null;
  extra_delay_seconds: number;
  store_coords: { lat: number; lng: number };
  customer_coords: { lat: number; lng: number };
  agent_coords: { lat: number; lng: number };
  location_updated_at: string | null;
  assigned_agent: {
    id: string;
    name: string;
    phone?: string | null;
    vehicleType?: string | null;
    avatarUrl?: string | null;
  } | null;
  transfers?: OrderTransfer[];
}

export interface NearestAgentInfo {
  id: string;
  name: string;
  phone?: string | null;
  vehicleType?: string | null;
  avatarUrl?: string | null;
  distanceKm: number;
  distanceFormatted: string;
  handoffEtaMinutes: number;
  assignmentTier?: 'IDLE_NEAREST' | 'BUSY_NEAREST';
  activeOrderCount?: number;
  statusText?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    phone?: string;
    address?: Address;
  };
  token: string;
  expiresIn: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

export interface AnalyticsSummary {
  totalCustomers: number;
  totalOrders: number;
  totalSales: number;
  totalCartItems: number;
  totalWishlistItems: number;
}

export interface CustomerActivitySummary {
  id: string;
  numericId: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  avatar: string;
  role: Role;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
  cartItemsCount: number;
  wishlistItemsCount: number;
}

export interface CustomerActivityDetail {
  customer: {
    id: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    avatar: string;
    role: Role;
    createdAt: string;
    address?: Address | null;
  };
  orders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: number;
    subtotal: number;
    tax: number;
    shippingFee: number;
    shippingMethod: string;
    paymentMethod: string;
    paymentStatus: string;
    shippingAddress: Address;
    createdAt: string;
    items: {
      id: number;
      productId: string;
      productName: string;
      productImage: string;
      price: number;
      quantity: number;
      selectedVariant?: string;
      selectedColor?: string;
      selectedSize?: string;
    }[];
  }[];
  cartItems: {
    id: string;
    productId: string;
    productName: string;
    productImage: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    selectedVariant?: string;
    selectedColor?: string;
    selectedSize?: string;
    createdAt: string;
  }[];
  wishlistItems: {
    id: string;
    productId: string;
    productName: string;
    productImage: string;
    category: string;
    price: number;
    createdAt: string;
  }[];
}

export type NotificationType =
  | 'COD_QR_COLLECTED'
  | 'COD_CASH_COLLECTED'
  | 'CASH_DEPOSIT_SUBMITTED'
  | 'CASH_DEPOSIT_APPROVED'
  | 'CASH_DEPOSIT_REJECTED';

export interface AppNotification {
  id: number | string;
  recipientRole: 'ADMIN' | 'DELIVERY_AGENT';
  recipientId?: string | number | null;
  orderId?: string | null;
  agentId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  amount?: number;
  isRead: boolean;
  createdAt: string;
}

export interface AmountHandlingSummary {
  upiQrTotal: number;
  upiQrConfirmed: number;
  upiQrAwaitingAdmin: number;
  cashTotal: number;
  cashApprovedAtStore: number;
  cashSubmittedAwaitingApproval: number;
  cashHeldByAgents: number;
  grandTotalCodRevenue: number;
  qrPendingOrders: Order[];
  depositApprovalAgents: {
    agentId: string;
    agentName: string;
    agentPhone: string;
    agentCode: string;
    avatarUrl: string;
    pendingCashAmount: number;
    cashDepositStatus: string;
    depositRejectionReason?: string | null;
    linkedOrders: {
      orderNumber: string;
      grandTotal: number;
      depositSubmittedAt?: string | null;
    }[];
  }[];
}
