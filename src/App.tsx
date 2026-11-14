import {
  ArrowUpDown,
  Boxes,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Filter,
  Flame,
  Grid3X3,
  Headphones,
  Laptop,
  LayoutGrid,
  List,
  Lock,
  Package,
  RotateCcw,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Truck,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiUrl } from './config/api.js';
import { AdminPanelModal } from './components/AdminPanelModal.js';
import { AuthModal } from './components/AuthModal.js';
import { CartDrawer } from './components/CartDrawer.js';
import { CheckoutModal } from './components/CheckoutModal.js';
import { Header } from './components/Header.js';
import { HeroBanner } from './components/HeroBanner.js';
import { NewsletterSection } from './components/NewsletterSection.js';
import { OrdersModal } from './components/OrdersModal.js';
import { ProductCard } from './components/ProductCard.js';
import { ProductDetailModal } from './components/ProductDetailModal.js';
import { WishlistModal } from './components/WishlistModal.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';
import { WishlistProvider } from './context/WishlistContext.js';
import { Product } from './types.js';

function ShopSphereMain() {
  const { token, isAuthenticated, user } = useAuth();

  // Navigation & Filtering State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [priceMax, setPriceMax] = useState<number>(2000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [page, setPage] = useState<number>(1);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Modals State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'register' | 'admin' }>({
    open: false,
    tab: 'login',
  });
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // URL Hash/Route protection for Admin Dashboard
  useEffect(() => {
    const handleUrlRoute = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === '#admin' || search.includes('admin')) {
        if (user?.role === 'admin') {
          setIsAdminOpen(true);
        } else {
          setAuthModal({ open: true, tab: 'admin' });
        }
      }
    };
    handleUrlRoute();
    window.addEventListener('hashchange', handleUrlRoute);
    return () => window.removeEventListener('hashchange', handleUrlRoute);
  }, [user]);

  // Fetch products from backend
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (sortBy) {
        params.append('sort', sortBy);
      }
      if (priceMax < 2000) {
        params.append('maxPrice', priceMax.toString());
      }
      params.append('page', page.toString());
      params.append('limit', '12');

      const res = await fetch(apiUrl(`/api/products?${params.toString()}`));
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          let list: Product[] = json.data;
          if (inStockOnly) {
            list = list.filter(p => Number(p.stock ?? 0) > 0);
          }
          setProducts(list);
          if (json.pagination) {
            setTotalProducts(json.pagination.total);
            setTotalPages(json.pagination.totalPages);
          }
        }
      } else {
        const errJson = await res.json().catch(() => null);
        console.warn('[Products Catalog Warning]: API returned status', res.status, errJson);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery, sortBy, priceMax, inStockOnly, page]);

  // Deep-linking: Auto-open product from URL query param (?product=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get('product');
    if (prodId) {
      fetch(apiUrl(`/api/products/${prodId}`))
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data) {
            setSelectedProduct(json.data);
          }
        })
        .catch(err => console.error('Failed to load shared product from URL:', err));
    }
  }, []);

  // Keep browser address bar synchronized with current active product modal
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedProduct) {
      url.searchParams.set('product', selectedProduct.id);
      window.history.replaceState(null, '', url.toString());
    } else {
      if (url.searchParams.has('product')) {
        url.searchParams.delete('product');
        window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
      }
    }
  }, [selectedProduct]);

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Header (Commercial Ecommerce with Wishlist, Live Search, Cart) */}
      <Header
        selectedCategory={selectedCategory}
        onSelectCategory={cat => {
          setSelectedCategory(cat);
          setPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={q => {
          setSearchQuery(q);
          setPage(1);
        }}
        onOpenAuth={tab => setAuthModal({ open: true, tab: tab || 'login' })}
        onOpenOrders={() => setIsOrdersOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onSelectProduct={p => setSelectedProduct(p)}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Hero Showcase & Flash Deals (Active on Home view without active text search) */}
        {selectedCategory === 'all' && !searchQuery && (
          <HeroBanner
            onSelectCategory={cat => {
              setSelectedCategory(cat);
              setPage(1);
            }}
          />
        )}

        {/* Filter, Sort & Catalog Toolbar */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title & Count */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h2 data-test="catalog-title" data-testid="catalog-title" className="text-base sm:text-lg font-extrabold text-slate-900 capitalize tracking-tight">
                {selectedCategory === 'all'
                  ? 'Curated Products Catalog'
                  : selectedCategory === 'electronics'
                  ? 'Smartphones & Flagship Tech'
                  : selectedCategory === 'fashion'
                  ? 'Designer Evening Dresses & Apparel'
                  : selectedCategory === 'audio'
                  ? 'Hi-Fi Audio & ANC Earbuds'
                  : selectedCategory === 'beauty'
                  ? 'Artisanal Perfumes & Fragrance'
                  : selectedCategory}
              </h2>
              <span data-test="catalog-total-count" data-testid="catalog-total-count" className="text-[11px] sm:text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
                {totalProducts} {totalProducts === 1 ? 'item' : 'items'}
              </span>
              {searchQuery && (
                <span data-test="search-query-badge" data-testid="search-query-badge" className="text-[11px] sm:text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                  Results for &ldquo;<strong className="text-slate-900">{searchQuery}</strong>&rdquo;
                </span>
              )}
            </div>

            {/* View Mode Switcher (Visible on both mobile & desktop) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                data-test="view-mode-grid"
                data-testid="view-mode-grid"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Single / Standard Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                data-test="view-mode-compact"
                data-testid="view-mode-compact"
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="2-Column Compact Grid"
              >
                <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Controls: Price Slider, In-Stock Toggle, Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Max Price Range Slider */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                <span className="text-slate-500 font-semibold">Max Price:</span>
                <input
                  data-test="filter-price-slider"
                  data-testid="filter-price-slider"
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={priceMax}
                  onChange={e => {
                    setPriceMax(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-24 sm:w-36 accent-indigo-600 cursor-pointer"
                />
                <span data-test="filter-price-display" data-testid="filter-price-display" className="font-extrabold font-mono text-slate-900">${priceMax}</span>
              </div>

              {/* In Stock Only Checkbox */}
              <label className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/70 px-3 py-2 rounded-xl border border-slate-200/80 cursor-pointer select-none transition-colors">
                <input
                  data-test="filter-in-stock-checkbox"
                  data-testid="filter-in-stock-checkbox"
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={e => setInStockOnly(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">In Stock Only</span>
              </label>

              {/* Sort Selection */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-semibold">Sort:</span>
                <select
                  data-test="sort-select"
                  data-testid="sort-select"
                  value={sortBy}
                  onChange={e => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                >
                  <option value="newest">Featured / Newest</option>
                  <option value="low-to-high">Price: Low to High</option>
                  <option value="high-to-low">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Reset Filters */}
            {(selectedCategory !== 'all' || searchQuery || priceMax < 2000 || inStockOnly || sortBy !== 'newest') && (
              <button
                data-test="reset-filters-button"
                data-testid="reset-filters-button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setSortBy('newest');
                  setPriceMax(2000);
                  setInStockOnly(false);
                  setPage(1);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Catalog Grid */}
        {loadingProducts ? (
          <div data-test="catalog-loading" data-testid="catalog-loading" className="py-24 text-center">
            <span className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block" />
            <p className="text-xs text-slate-500 mt-3 font-bold">Curating catalog collection...</p>
          </div>
        ) : products.length === 0 ? (
          <div data-test="empty-catalog-message" data-testid="empty-catalog-message" className="py-20 text-center bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs">
            <Package className="w-12 h-12 stroke-1 mx-auto text-slate-300 mb-2" />
            <h3 className="text-base font-bold text-slate-900">No items match your selected filters</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try broadening your price range, choosing all categories, or clearing search keywords.
            </p>
            <button
              data-test="show-all-products-button"
              data-testid="show-all-products-button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setPriceMax(2000);
                setInStockOnly(false);
              }}
              className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div
            data-test="product-catalog-grid"
            data-testid="product-catalog-grid"
            className={`grid gap-3 sm:gap-5 ${
              viewMode === 'compact'
                ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {products.map(prod => (
              <ProductCard
                key={prod.id}
                product={prod}
                onSelect={p => setSelectedProduct(p)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div data-test="pagination-container" data-testid="pagination-container" className="pt-4 flex items-center justify-center gap-2">
            <button
              data-test="pagination-prev"
              data-testid="pagination-prev"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-white shadow-2xs transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span data-test="pagination-page-indicator" data-testid="pagination-page-indicator" className="text-xs font-bold text-slate-700 px-3">
              Page {page} of {totalPages}
            </span>
            <button
              data-test="pagination-next"
              data-testid="pagination-next"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-white shadow-2xs transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

        {/* 3. Newsletter VIP Club & FAQ Accordion Section */}
        <NewsletterSection />
      </main>

      {/* 4. Real E-Commerce Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Column 1: Brand Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-extrabold text-lg">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span>ShopSphere</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                The premier commercial multi-category lifestyle boutique. Featuring artisanal evening dresses, flagship smartphones, hi-res studio acoustics, and luxury fragrances.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Authorized Official Store</span>
              </div>
            </div>

            {/* Column 2: Customer Service */}
            <div>
              <h4 className="text-white font-extrabold mb-3 uppercase text-xs tracking-wider">
                Customer Care
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    data-test="footer-track-orders"
                    data-testid="footer-track-orders"
                    onClick={() => setIsOrdersOpen(true)}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Track Orders &amp; Invoices
                  </button>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">
                    Shipping &amp; Delivery Policies
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">
                    30-Day Easy Returns Guarantee
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">
                    Authenticity &amp; 2-Year Warranty
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-pointer">
                    Help Center &amp; Live Chat
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 3: Catalog Collections */}
            <div>
              <h4 className="text-white font-extrabold mb-3 uppercase text-xs tracking-wider">
                Top Categories
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => {
                      setSelectedCategory('electronics');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Smartphones &amp; 5G Mobiles
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSelectedCategory('fashion');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Silk &amp; Chiffon Evening Dresses
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSelectedCategory('audio');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Hi-Fi Bluetooth ANC Earbuds
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSelectedCategory('beauty');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Oud &amp; Amber Niche Perfumes
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Security & Developer Testing Links */}
            <div>
              <h4 className="text-white font-extrabold mb-3 uppercase text-xs tracking-wider">
                Security &amp; API Portal
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>256-Bit SSL Encryption</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    All payment processing and customer data are fully safeguarded with bank-grade encryption.
                  </p>
                </div>

                {/* Seperate Swagger API testing link for backend engineers/testers */}
                <div className="pt-1">
                  <p className="text-[11px] text-slate-400">Backend API Testing Console:</p>
                  <a
                    data-test="footer-swagger-link"
                    data-testid="footer-swagger-link"
                    href="/api-docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-bold text-xs mt-1 transition-colors underline"
                  >
                    <span>Open Standalone Swagger UI</span>
                    <span className="font-mono text-[10px]">(/api-docs) ↗</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Payment Badges */}
          <div className="border-t border-slate-800 pt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} ShopSphere Inc. All rights reserved.</p>

            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-semibold">
                VISA
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-semibold">
                Mastercard
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-semibold">
                Amex
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-semibold">
                Apple Pay
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-semibold">
                Google Pay
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-semibold">
                UPI / NetBanking
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Slide-over Cart Drawer */}
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />

      {/* Slide-over Wishlist Modal */}
      <WishlistModal onSelectProduct={p => setSelectedProduct(p)} />

      {/* Product Detail Modal (PDP) with Reviews */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenCheckout={() => setIsCheckoutOpen(true)}
        onProductUpdated={updatedProd => {
          setSelectedProduct(updatedProd);
          setProducts(prev => prev.map(p => (p.id === updatedProd.id ? updatedProd : p)));
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onViewOrders={() => setIsOrdersOpen(true)}
      />

      {/* Auth Modal (Login / Register / Admin) */}
      <AuthModal
        isOpen={authModal.open}
        initialTab={authModal.tab}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        onAdminSuccess={() => {
          setAuthModal({ open: false, tab: 'login' });
          setIsAdminOpen(true);
        }}
      />

      {/* Orders & Invoice Modal */}
      <OrdersModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
      />

      {/* Admin Panel Modal */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onRefreshCatalog={fetchProducts}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <ShopSphereMain />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
