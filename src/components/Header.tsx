import {
  Boxes,
  Check,
  ChevronDown,
  Flame,
  Globe,
  Headphones,
  Heart,
  Laptop,
  Lock,
  LogOut,
  Package,
  Phone,
  Search,
  Shield,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Truck,
  User as UserIcon,
  X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { useWishlist } from '../context/WishlistContext.js';
import { Product } from '../types.js';
import { apiUrl } from '../config/api.js';

interface HeaderProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAuth: (initialTab?: 'login' | 'register' | 'admin') => void;
  onOpenOrders: () => void;
  onOpenAdmin: () => void;
  onSelectProduct?: (product: Product) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenAuth,
  onOpenOrders,
  onOpenAdmin,
  onSelectProduct,
}) => {
  const { user, isAuthenticated, isAdmin, logout, quickLogin } = useAuth();
  const { totalItemCount, openCart, subtotal } = useCart();
  const { wishlistCount, openWishlist } = useWishlist();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [searchPreviewResults, setSearchPreviewResults] = useState<Product[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Live search preview query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchPreviewResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/products?search=${encodeURIComponent(searchQuery.trim())}&limit=5`));
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setSearchPreviewResults(json.data);
          }
        }
      } catch (err) {
        console.error('Failed search preview:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside search preview to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = [
    { id: 'all', label: 'All Products', icon: Boxes },
    { id: 'electronics', label: 'Smartphones & Tech', icon: Laptop },
    { id: 'fashion', label: 'Fashion & Dresses', icon: Shirt },
    { id: 'audio', label: 'Hi-Fi Audio', icon: Headphones },
    { id: 'beauty', label: 'Luxury Fragrance', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
      {/* 1. Top E-Commerce Announcement Bar */}
      <div className="bg-slate-950 text-slate-300 text-[11px] px-4 py-2 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Promotional Highlight */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Flame className="w-3 h-3 text-amber-400" />
              FLASH SALE
            </span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="text-slate-200 font-medium">
              Extra <strong>20% OFF</strong> on all items! Use code <strong className="text-white underline decoration-indigo-400">SPHERE20</strong> at checkout
            </span>
          </div>

          {/* Right: Customer Services & Utilities */}
          <div className="flex items-center gap-4 text-slate-300 ml-auto">
            <div className="hidden lg:flex items-center gap-1.5 text-slate-400">
              <Truck className="w-3 h-3 text-emerald-400" />
              <span>Free Worldwide Express over $50</span>
            </div>

            <div className="hidden md:flex items-center gap-1 text-slate-400">
              <Phone className="w-3 h-3" />
              <span>+1 (800) 555-SHOP</span>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer">
              <Globe className="w-3 h-3" />
              <select
                data-test="currency-selector"
                data-testid="currency-selector"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="bg-transparent text-slate-300 font-semibold outline-none cursor-pointer text-[11px]"
              >
                <option value="USD" className="bg-slate-900 text-white">USD ($)</option>
                <option value="EUR" className="bg-slate-900 text-white">EUR (€)</option>
                <option value="GBP" className="bg-slate-900 text-white">GBP (£)</option>
              </select>
            </div>

            {/* Track Orders shortcut */}
            <button
              data-test="nav-track-order"
              data-testid="nav-track-order"
              onClick={onOpenOrders}
              className="text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              data-test="nav-logo"
              data-testid="nav-logo"
              onClick={() => onSelectCategory('all')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-base sm:text-xl font-extrabold tracking-tight text-slate-950 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5 font-sans">
                  ShopSphere
                  <span className="hidden md:inline-block text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Official
                  </span>
                </span>
                <p className="hidden sm:block text-[11px] text-slate-500 font-medium leading-none">Luxury Lifestyle &amp; Tech</p>
              </div>
            </button>
          </div>

          {/* Search Bar with live autocomplete preview */}
          <div ref={searchContainerRef} className="flex-1 max-w-xl mx-2 hidden sm:block relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                data-test="search-input"
                data-testid="search-input"
                type="text"
                placeholder="Search dresses, smartphones, audio devices, perfumes..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={e => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-sm text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  data-test="search-clear"
                  data-testid="search-clear"
                  onClick={() => {
                    onSearchChange('');
                    setSearchPreviewResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Autocomplete Search Results Dropdown */}
            {isSearchFocused && searchPreviewResults.length > 0 && (
              <div
                data-test="search-preview-dropdown"
                data-testid="search-preview-dropdown"
                className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Quick Results</span>
                  <span>{searchPreviewResults.length} matches</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {searchPreviewResults.map(p => (
                    <div
                      key={p.id}
                      data-test={`search-preview-item-${p.id}`}
                      data-testid={`search-preview-item-${p.id}`}
                      onClick={() => {
                        setIsSearchFocused(false);
                        if (onSelectProduct) onSelectProduct(p);
                      }}
                      className="p-2 flex items-center gap-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                    >
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.title}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{p.subcategory}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-900">${p.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2.5">
            {/* Admin Portal / Admin Dashboard Button */}
            {isAdmin ? (
              <button
                data-test="nav-admin-dashboard"
                data-testid="nav-admin-dashboard"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer shadow-xs"
                title="Open Admin Analytics Dashboard"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="hidden sm:inline">Admin Dashboard</span>
                <span className="sm:hidden text-[11px]">Admin</span>
              </button>
            ) : (
              <button
                data-test="nav-admin-login"
                data-testid="nav-admin-login"
                onClick={() => onOpenAuth('admin')}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Administrator Login"
              >
                <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="hidden sm:inline">Admin Login</span>
                <span className="sm:hidden text-[11px]">Admin</span>
              </button>
            )}

            {/* Customer Test Accounts Switcher Pill */}
            <div className="relative">
              <button
                data-test="demo-accounts-menu"
                data-testid="demo-accounts-menu"
                onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Switch demo customer accounts"
              >
                <UserIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="hidden lg:inline">Customer Demos</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isDemoMenuOpen && (
                <div
                  data-test="demo-accounts-dropdown"
                  data-testid="demo-accounts-dropdown"
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setIsDemoMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">Customer Test Profiles</p>
                    <p className="text-[11px] text-slate-500">Quick sign-in for customer testing</p>
                  </div>

                  <div className="py-1 space-y-1">
                    <button
                      data-test="demo-account-customer1"
                      data-testid="demo-account-customer1"
                      onClick={async () => {
                        await quickLogin('customer1');
                        setIsDemoMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-indigo-50/70 text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Jane Customer (User 1)</p>
                        <p className="text-[10px] text-slate-500 font-mono">customer@practicesoftwaretesting.com</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                        Customer
                      </span>
                    </button>

                    <button
                      data-test="demo-account-customer2"
                      data-testid="demo-account-customer2"
                      onClick={async () => {
                        await quickLogin('customer2');
                        setIsDemoMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-indigo-50/70 text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">Alex Rivera (User 2)</p>
                        <p className="text-[10px] text-slate-500 font-mono">customer2@practicesoftwaretesting.com</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                        Customer
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Wishlist Button */}
            <button
              data-test="nav-wishlist"
              data-testid="nav-wishlist"
              onClick={openWishlist}
              className="relative p-2 sm:p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="View Wishlist"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              {wishlistCount > 0 && (
                <span
                  data-test="wishlist-count"
                  data-testid="wishlist-count"
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse"
                >
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Drawer Trigger */}
            <button
              data-test="nav-cart"
              data-testid="nav-cart"
              onClick={openCart}
              className="relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-950 hover:bg-indigo-600 text-white font-semibold text-xs shadow-md shadow-slate-950/15 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden md:inline font-bold">Cart</span>
              {totalItemCount > 0 && (
                <span
                  data-test="cart-count"
                  data-testid="cart-count"
                  className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-extrabold"
                >
                  {totalItemCount}
                </span>
              )}
              {subtotal > 0 && (
                <span
                  data-test="cart-nav-subtotal"
                  data-testid="cart-nav-subtotal"
                  className="hidden lg:inline font-mono border-l border-white/20 pl-1.5"
                >
                  ${subtotal.toFixed(2)}
                </span>
              )}
            </button>

            {/* User Account Menu */}
            <div className="relative shrink-0">
              {isAuthenticated ? (
                <div>
                  <button
                    data-test="user-menu-button"
                    data-testid="user-menu-button"
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user?.name.charAt(0) || 'U'
                      )}
                    </div>
                    <span className="text-xs font-semibold hidden md:inline truncate max-w-28">
                      {user?.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isAccountMenuOpen && (
                    <div
                      data-test="user-menu-dropdown"
                      data-testid="user-menu-dropdown"
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                      onMouseLeave={() => setIsAccountMenuOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p data-test="user-profile-name" data-testid="user-profile-name" className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                        <p data-test="user-profile-email" data-testid="user-profile-email" className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                        {isAdmin && (
                          <span data-test="user-role-badge" data-testid="user-role-badge" className="mt-1 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Administrator
                          </span>
                        )}
                      </div>

                      <div className="py-1">
                        <button
                          data-test="user-orders-link"
                          data-testid="user-orders-link"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenOrders();
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>My Orders &amp; Invoices</span>
                        </button>

                        <button
                          data-test="user-wishlist-link"
                          data-testid="user-wishlist-link"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            openWishlist();
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          <span>Saved Wishlist ({wishlistCount})</span>
                        </button>

                        {isAdmin && (
                          <button
                            data-test="user-admin-link"
                            data-testid="user-admin-link"
                            onClick={() => {
                              setIsAccountMenuOpen(false);
                              onOpenAdmin();
                            }}
                            className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-indigo-50 text-indigo-700 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Shield className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Admin Catalog Dashboard</span>
                          </button>
                        )}

                        <div className="my-1 border-t border-slate-100" />

                        <button
                          data-test="user-logout-button"
                          data-testid="user-logout-button"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-rose-50 text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    data-test="nav-signin"
                    data-testid="nav-signin"
                    onClick={() => onOpenAuth('login')}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    data-test="nav-register"
                    data-testid="nav-register"
                    onClick={() => onOpenAuth('register')}
                    className="px-2.5 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer hidden md:inline-block"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar (Only visible on screens < sm) */}
        <div className="sm:hidden pt-2.5 pb-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              data-test="mobile-search-input"
              data-testid="mobile-search-input"
              type="text"
              placeholder="Search products, phones, dresses..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 text-xs text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange('');
                  setSearchPreviewResults([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Category Navigation Strip */}
      <div className="bg-slate-50/90 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-1 py-1 text-xs">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                data-test={`category-${cat.id}`}
                data-testid={`category-${cat.id}`}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
