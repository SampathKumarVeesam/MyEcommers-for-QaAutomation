import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Heart,
  HelpCircle,
  MapPin,
  MessageSquare,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  User,
  X,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { useWishlist } from '../context/WishlistContext.js';
import { Product, Review } from '../types.js';

interface StoreInventory {
  productId: number;
  productCode?: string;
  storeId: number;
  storeName?: string;
  stockAvailable: number;
}

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenCheckout?: () => void;
  onProductUpdated?: (updatedProduct: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenCheckout,
  onProductUpdated,
}) => {
  const { addToCart, openCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();

  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Tabs: Details, In-Store Stock, Customer Reviews
  const [activeTab, setActiveTab] = useState<'details' | 'stock' | 'reviews'>('details');

  // Multi-Store Inventory State
  const [storeInventory, setStoreInventory] = useState<StoreInventory[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Customer Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewName, setReviewName] = useState(user?.name || '');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);

  // Synchronize state when product changes
  useEffect(() => {
    if (product) {
      setSelectedImage(0);
      setQuantity(1);
      setSelectedSize(product.sizeOptions?.[0]);
      setSelectedColor(product.colorOptions?.[0]?.name);
      setSelectedVariant(product.variants?.[0]?.name);
      setActiveTab('details');
      fetchReviews(product.id);
      fetchStoreInventory(product.id);
    }
  }, [product]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fetchReviews = async (productId: string) => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setReviews(json.data);
        }
      }
    } catch (e) {
      console.error('Failed to load reviews:', e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchStoreInventory = async (productId: string) => {
    setLoadingInventory(true);
    try {
      const res = await fetch(`/api/inventory/${productId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStoreInventory(json.data);
        }
      }
    } catch (e) {
      console.error('Failed to load store inventory:', e);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !reviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: reviewName.trim() || user?.name || 'Verified Customer',
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setReviews(prev => [json.data, ...prev]);
          setReviewComment('');
          setReviewSuccessMessage('Thank you! Your verified review has been published.');
          setTimeout(() => setReviewSuccessMessage(null), 3500);
          if (json.updatedProduct && onProductUpdated) {
            onProductUpdated(json.updatedProduct);
          }
        }
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!product) return null;

  const isFavorited = isInWishlist(product.id);
  const images = product.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];

  const discountPercent = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  const handleAddToCart = async () => {
    setIsAdding(true);
    const res = await addToCart(product.id, quantity, {
      selectedVariant,
      selectedColor,
      selectedSize,
    });
    setIsAdding(false);
    if (res.success) {
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    }
  };

  const handleBuyNow = async () => {
    setIsBuyingNow(true);
    const res = await addToCart(product.id, quantity, {
      selectedVariant,
      selectedColor,
      selectedSize,
    });
    setIsBuyingNow(false);
    if (res.success) {
      onClose();
      if (onOpenCheckout) {
        onOpenCheckout();
      } else {
        openCart();
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Safely check scent pyramid existence
  const hasValidScentPyramid = Boolean(
    product.scentNotes &&
    Array.isArray(product.scentNotes.top) &&
    product.scentNotes.top.length > 0
  );

  // Safely check specifications existence
  const hasValidSpecifications = Boolean(
    product.specifications &&
    typeof product.specifications === 'object' &&
    Object.keys(product.specifications).length > 0
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-5xl max-h-[92vh] overflow-y-auto flex flex-col my-auto transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar inside Modal */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="capitalize">{product.category}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold">{product.subcategory}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-indigo-600 font-bold truncate max-w-[200px] sm:max-w-xs">{product.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Copy product link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8">
          {/* LEFT COLUMN: Interactive Media Gallery (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Primary High-Res Stage */}
            <div className="relative aspect-square w-full rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 group shadow-inner">
              <img
                src={images[selectedImage] || images[0]}
                alt={product.title}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />

              {/* Badges on image */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/95 text-slate-900 shadow-sm backdrop-blur-xs border border-slate-200">
                  {product.subcategory}
                </span>
                {discountPercent && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-600 text-white shadow-sm">
                    {discountPercent}% OFF
                  </span>
                )}
                {product.featured && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-sm">
                    Bestseller
                  </span>
                )}
              </div>

              {/* Wishlist toggle button */}
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isFavorited
                    ? 'bg-rose-50 text-rose-600 shadow-md ring-2 ring-rose-500/30'
                    : 'bg-white/90 hover:bg-white text-slate-500 hover:text-rose-600 shadow-sm'
                }`}
                title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>

            {/* Thumbnail Navigation Strip */}
            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedImage === idx
                        ? 'border-indigo-600 ring-2 ring-indigo-500/30 scale-95'
                        : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Commercial E-Commerce Trust Pillars */}
            <div className="mt-2 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Free express shipping over $75</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>30-Day Easy Returns</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <span>100% Genuine Guaranteed</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>2-Year Official Warranty</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Details, Multi-Store Stock & Add to Cart (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {product.title}
              </h1>

              {/* Rating, Reviews count & Stock Pill */}
              <div className="flex flex-wrap items-center gap-3 mt-2.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>

                <button
                  onClick={() => setActiveTab('reviews')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  {reviews.length > 0 ? `${reviews.length} verified customer reviews` : `${product.reviewsCount} reviews`}
                </button>

                <span className="text-slate-300">•</span>

                {/* Stock status indicator */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  product.stock > 5
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : product.stock > 0
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${product.stock > 5 ? 'bg-emerald-500' : product.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                  {product.stock > 5
                    ? `${product.stock} in stock`
                    : product.stock > 0
                    ? `Only ${product.stock} left in stock!`
                    : 'Currently Out of Stock'}
                </span>
              </div>

              {/* Pricing Box */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-black text-slate-900">
                  ${product.price.toFixed(2)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <>
                    <span className="text-lg text-slate-400 line-through">
                      ${product.compareAtPrice.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      Save ${(product.compareAtPrice - product.price).toFixed(2)} ({discountPercent}% OFF)
                    </span>
                  </>
                )}
              </div>

              {/* Low Stock Urgency Banner */}
              {product.stock <= 5 && product.stock > 0 && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0 fill-amber-500" />
                  <span><strong>High demand!</strong> Multiple customers have this item in their cart right now.</span>
                </div>
              )}

              {/* Tabs Navigation: Specs vs In-Store Stock vs Reviews */}
              <div className="mt-5 flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`pb-2.5 px-3.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                    activeTab === 'details'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Overview &amp; Specs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('stock')}
                  className={`pb-2.5 px-3.5 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'stock'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Store Inventory ({storeInventory.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2.5 px-3.5 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'reviews'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Customer Reviews ({reviews.length})</span>
                </button>
              </div>

              {/* TAB 1: PRODUCT DETAILS & CONFIGURATION */}
              {activeTab === 'details' && (
                <div className="mt-4 space-y-4">
                  {/* Description */}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Fashion Sizing Selector */}
                  {product.sizeOptions && product.sizeOptions.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-900">
                          Select Size: <span className="font-semibold text-indigo-600">{selectedSize}</span>
                        </label>
                        <span className="text-[11px] text-slate-400">Standard US/EU Sizing</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.sizeOptions.map(sz => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(sz)}
                            className={`min-w-11 h-10 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                              selectedSize === sz
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Swatches */}
                  {product.colorOptions && product.colorOptions.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-2">
                        Selected Color: <span className="font-semibold text-indigo-600">{selectedColor}</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {product.colorOptions.map(clr => (
                          <button
                            key={clr.name}
                            type="button"
                            onClick={() => setSelectedColor(clr.name)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                              selectedColor === clr.name
                                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0"
                              style={{ backgroundColor: clr.hex }}
                            />
                            <span>{clr.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hardware Configuration / Storage Variants */}
                  {product.variants && product.variants.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-2">
                        Hardware Configuration:
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {product.variants.map(v => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariant(v.name)}
                            className={`text-left p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                              selectedVariant === v.name
                                ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <p className="font-bold text-slate-900">{v.name}</p>
                              <p className="text-[11px] text-slate-500">SKU: {v.sku} • {v.stock} in stock</p>
                            </div>
                            <span className="font-bold text-slate-900">
                              {v.priceDelta > 0 ? `+$${v.priceDelta.toFixed(2)}` : 'Standard'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Beauty Scent Pyramid (safely guarded) */}
                  {hasValidScentPyramid && product.scentNotes && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-2.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>Fragrance Olfactory Pyramid:</span>
                      </div>
                      <div className="space-y-1.5">
                        {product.scentNotes.top && (
                          <div>
                            <strong className="text-amber-800">Top Notes:</strong>{' '}
                            <span className="text-slate-700">{product.scentNotes.top.join(', ')}</span>
                          </div>
                        )}
                        {product.scentNotes.heart && (
                          <div>
                            <strong className="text-amber-800">Heart Notes:</strong>{' '}
                            <span className="text-slate-700">{product.scentNotes.heart.join(', ')}</span>
                          </div>
                        )}
                        {product.scentNotes.base && (
                          <div>
                            <strong className="text-amber-800">Base Notes:</strong>{' '}
                            <span className="text-slate-700">{product.scentNotes.base.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Technical Specifications (safely guarded) */}
                  {hasValidSpecifications && product.specifications && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                        Product Specifications:
                      </h4>
                      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
                        {Object.entries(product.specifications).map(([key, val]) => (
                          <div key={key} className="grid grid-cols-3 p-2.5 bg-white even:bg-slate-50/60">
                            <span className="font-semibold text-slate-600 col-span-1">{key}</span>
                            <span className="text-slate-800 col-span-2 font-mono text-[11px]">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MULTI-STORE PHYSICAL INVENTORY */}
              {activeTab === 'stock' && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Real-time inventory backed by PostgreSQL 18 <code>inventory</code> table across retail hubs.</span>
                  </div>

                  {loadingInventory ? (
                    <div className="py-6 text-center text-xs text-slate-400">Loading store availability...</div>
                  ) : storeInventory.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Standard warehouse fulfillment available for this product.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {storeInventory.map((st) => (
                        <div
                          key={st.storeId}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{st.storeName}</p>
                              <p className="text-[11px] text-slate-400">Retail Hub #{st.storeId}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              st.stockAvailable > 5
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : st.stockAvailable > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {st.stockAvailable > 0 ? `${st.stockAvailable} available` : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CUSTOMER REVIEWS */}
              {activeTab === 'reviews' && (
                <div className="mt-4 space-y-4">
                  {/* Write a Review Form */}
                  <form onSubmit={handleReviewSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900 mb-2">Write a Customer Review</h4>
                    {reviewSuccessMessage && (
                      <div className="mb-3 p-2.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{reviewSuccessMessage}</span>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-600">Your Rating:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Your Name (e.g. Jane D.)"
                        value={reviewName}
                        onChange={e => setReviewName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                        required
                      />

                      <textarea
                        rows={2}
                        placeholder="Share details of your experience with this item..."
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                        required
                      />

                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>{submittingReview ? 'Submitting to PostgreSQL...' : 'Post Review'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Reviews List */}
                  {loadingReviews ? (
                    <div className="py-6 text-center text-xs text-slate-400">Loading reviews...</div>
                  ) : reviews.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No reviews yet. Be the first to share your thoughts on this product!
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {reviews.map(rev => (
                        <div key={rev.id} className="p-3.5 rounded-xl border border-slate-100 bg-white">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                                {rev.userName.charAt(0)}
                              </div>
                              <span className="text-xs font-bold text-slate-800">{rev.userName}</span>
                              {rev.verifiedPurchase && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Verified Buyer
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{rev.comment}</p>
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BOTTOM ACTION BAR: Stepper + Add to Cart + Buy Now */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-3">
              {/* Quantity Stepper */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  title="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-extrabold text-sm text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  title="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Basket Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding || product.stock <= 0}
                className={`flex-1 w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  addedSuccess
                    ? 'bg-emerald-600 text-white shadow-md'
                    : product.stock <= 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-indigo-600 text-white shadow-lg active:scale-98'
                }`}
              >
                {addedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Basket!</span>
                  </>
                ) : isAdding ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Basket • ${(product.price * quantity).toFixed(2)}</span>
                  </>
                )}
              </button>

              {/* Buy Now Button (1-Click Instant Checkout) */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isBuyingNow || product.stock <= 0}
                className="w-full sm:w-auto py-3 px-6 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Buy Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
