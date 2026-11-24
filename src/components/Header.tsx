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
  onOpenProfile?: () => void;
  onOpenAgentPortal?: () => void;
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
  onOpenProfile,
  onOpenAgentPortal,
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
  const demoMenuRef = useRef<HTMLDivElement>(null);

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

  // Click outside search preview and demo menu to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (demoMenuRef.current && !demoMenuRef.current.contains(e.target as Node)) {
        setIsDemoMenuOpen(false);
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
      {/* Main Navbar */}
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
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:text-slate-900 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 outline-none transition-all shadow-2xs font-medium"
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
            {/* Customer Test Accounts Switcher Pill */}
            <div ref={demoMenuRef} className="relative">
              <button
                data-test="demo-accounts-menu"
                data-testid="demo-accounts-menu"
                onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-800 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                title="Switch demo customer accounts"
              >
                <UserIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="hidden lg:inline font-bold">Customer Demos</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isDemoMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDemoMenuOpen && (
                <div
                  data-test="demo-accounts-dropdown"
                  data-testid="demo-accounts-dropdown"
                  className="absolute right-0 mt-2 w-72 sm:w-84 min-w-[290px] bg-slate-900/95 border border-indigo-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(99,102,241,0.15)] backdrop-blur-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-white"
                  onMouseLeave={() => setIsDemoMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white tracking-tight flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Customer Test Profiles
                      </p>
                      <p className="text-[10px] text-slate-400">PostgreSQL 18 Real-time Authentication</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live DB
                    </span>
                  </div>

                  <div className="py-1.5 space-y-1.5">
                    <button
                      data-test="demo-account-customer1"
                      data-testid="demo-account-customer1"
                      onClick={async () => {
                        await quickLogin('customer1');
                        setIsDemoMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs rounded-xl bg-white/[0.04] hover:bg-indigo-600/25 border border-white/5 hover:border-indigo-500/40 text-slate-200 hover:text-white transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                        JC
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate text-xs">Jane Customer (User 1)</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">customer@practicesoftwaretesting.com</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
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
                      className="w-full text-left px-3 py-2.5 text-xs rounded-xl bg-white/[0.04] hover:bg-indigo-600/25 border border-white/5 hover:border-indigo-500/40 text-slate-200 hover:text-white transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                        AR
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white truncate text-xs">Alex Rivera (User 2)</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">customer2@practicesoftwaretesting.com</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
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
                      {user?.avatarUrl || user?.avatar ? (
                        <img src={user.avatarUrl || user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (user?.name || 'U').charAt(0)
                      )}
                    </div>
                    <span className="text-xs font-semibold hidden md:inline truncate max-w-28">
                      {user?.name ? user.name.split(' ')[0] : 'Account'}
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
                          data-test="user-profile-settings-link"
                          data-testid="user-profile-settings-link"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            onOpenProfile?.();
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Profile &amp; Avatar Settings</span>
                        </button>

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

                        <button
                          type="button"
                          data-test="user-delivery-portal-link"
                          data-testid="user-delivery-portal-link"
                          onClick={() => {
                            setIsAccountMenuOpen(false);
                            window.history.pushState({}, '', '/delivery');
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-amber-50 text-amber-700 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5 text-amber-600" />
                          <span>Delivery Agent Portal</span>
                        </button>

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
                    data-test="nav-signin nav-signin-btn"
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
              className="w-full pl-9 pr-8 py-2 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:text-slate-900 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-2xs font-medium"
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
