export type Role = 'admin' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string;
  avatar?: string;
  address?: Address;
  createdAt: string;
}

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

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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
  paymentStatus: 'paid' | 'pending' | 'cod_pending';
  orderStatus: OrderStatus;
  subtotal: number;
  tax: number;
  shippingFee: number;
  grandTotal: number;
  trackingNumber: string;
  createdAt: string;
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
