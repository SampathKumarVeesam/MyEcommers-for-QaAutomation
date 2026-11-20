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
  deliveryFee?: number;
  codPaymentMethod?: 'cash' | 'upi' | null;
  codPaymentStatus?: 'pending' | 'paid' | null;
  deliveryOtp?: string | null;
  otpVerified?: boolean;
  deliveredAt?: string | null;
  feedbackStatus?: 'pending' | 'submitted' | 'dismissed_forever';
  nextFeedbackReminderAt?: string | null;
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
