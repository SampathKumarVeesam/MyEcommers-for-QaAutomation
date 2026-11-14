import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Heart,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
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
import { apiUrl } from '../config/api.js';

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
  const [isShareOpen, setIsShareOpen] = useState(false);
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
      setIsShareOpen(false);
      fetchReviews(product.id);
      fetchStoreInventory(product.id);
    }
  }, [product]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isShareOpen) {
          setIsShareOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isShareOpen]);

  const fetchReviews = async (productId: string) => {
    setLoadingReviews(true);
    try {
      const res = await fetch(apiUrl(`/api/products/${productId}/reviews`));
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
      const res = await fetch(apiUrl(`/api/inventory/${productId}`));
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
      const res = await fetch(apiUrl(`/api/products/${product.id}/reviews`), {
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

  // Exact canonical product URL
  const productUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?product=${product.id}`
    : `https://samecommers.netlify.app/?product=${product.id}`;

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out ${product.title} on ShopSphere ($${product.price.toFixed(2)})!`,
          url: productUrl,
        });
      } catch (err) {
        console.log('Share canceled or not supported');
      }
    } else {
      setIsShareOpen(true);
    }
  };

  // Social media platforms config
  const sharePlatforms = [
    {
      name: 'WhatsApp',
      bg: 'bg-emerald-500 hover:bg-emerald-600',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      ),
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${product.title} ($${product.price.toFixed(2)}) on ShopSphere: ${productUrl}`)}`,
    },
    {
      name: 'X (Twitter)',
      bg: 'bg-black hover:bg-slate-900',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${product.title} on ShopSphere!`)}&url=${encodeURIComponent(productUrl)}`,
    },
    {
      name: 'Facebook',
      bg: 'bg-[#1877F2] hover:bg-[#166fe5]',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
    },
    {
      name: 'LinkedIn',
      bg: 'bg-[#0A66C2] hover:bg-[#095196]',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      ),
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`,
    },
    {
      name: 'Telegram',
      bg: 'bg-[#229ED9] hover:bg-[#1f8fc4]',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z"/>
        </svg>
      ),
      url: `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(`Check out ${product.title} on ShopSphere: ${productUrl}`)}`,
    },
    {
      name: 'Pinterest',
      bg: 'bg-[#E60023] hover:bg-[#cc001f]',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.332 1.357-.053.211-.174.256-.402.155-1.498-.698-2.435-2.889-2.435-4.651 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
        </svg>
      ),
      url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(productUrl)}&media=${encodeURIComponent(images[0])}&description=${encodeURIComponent(product.title)}`,
    },
    {
      name: 'Reddit',
      bg: 'bg-[#FF4500] hover:bg-[#e03d00]',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z"/>
        </svg>
      ),
      url: `https://reddit.com/submit?url=${encodeURIComponent(productUrl)}&title=${encodeURIComponent(product.title)}`,
    },
    {
      name: 'Email',
      bg: 'bg-slate-700 hover:bg-slate-800',
      icon: <Mail className="w-4 h-4" />,
      url: `mailto:?subject=${encodeURIComponent(`Check out ${product.title} on ShopSphere`)}&body=${encodeURIComponent(`Hi,\n\nI thought you might like this on ShopSphere:\n\n${product.title}\nPrice: $${product.price.toFixed(2)}\n\nDirect Link:\n${productUrl}`)}`,
    },
  ];

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
    <>
      <div
        data-test="pdp-modal"
        data-testid="pdp-modal"
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
              <span className="text-indigo-600 font-bold truncate max-w-[180px] sm:max-w-xs">{product.title}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Interactive Share Button */}
              <button
                type="button"
                data-test="pdp-share-button"
                data-testid="pdp-share-button"
                onClick={() => setIsShareOpen(true)}
                className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Share this product"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Share</span>
              </button>

              <button
                type="button"
                data-test="pdp-close-button"
                data-testid="pdp-close-button"
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
                  data-test="pdp-main-image"
                  data-testid="pdp-main-image"
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
                  data-test="pdp-wishlist-toggle"
                  data-testid="pdp-wishlist-toggle"
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
                      data-test={`pdp-thumbnail-${idx}`}
                      data-testid={`pdp-thumbnail-${idx}`}
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
                <h1
                  data-test="pdp-title"
                  data-testid="pdp-title"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug"
                >
                  {product.title}
                </h1>

                {/* Rating, Reviews count & Stock Pill */}
                <div className="flex flex-wrap items-center gap-3 mt-2.5">
                  <div
                    data-test="pdp-rating"
                    data-testid="pdp-rating"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{product.rating.toFixed(1)}</span>
                  </div>

                  <button
                    data-test="pdp-reviews-count-link"
                    data-testid="pdp-reviews-count-link"
                    onClick={() => setActiveTab('reviews')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    {reviews.length > 0 ? `${reviews.length} verified customer reviews` : `${product.reviewsCount} reviews`}
                  </button>

                  <span className="text-slate-300">•</span>

                  {/* Stock status indicator */}
                  <span
                    data-test="pdp-stock-badge"
                    data-testid="pdp-stock-badge"
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      product.stock > 5
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : product.stock > 0
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
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
                  <span
                    data-test="pdp-price"
                    data-testid="pdp-price"
                    className="text-3xl font-black text-slate-900"
                  >
                    ${product.price.toFixed(2)}
                  </span>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <>
                      <span
                        data-test="pdp-compare-price"
                        data-testid="pdp-compare-price"
                        className="text-lg text-slate-400 line-through"
                      >
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
                    data-test="pdp-tab-details"
                    data-testid="pdp-tab-details"
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
                    data-test="pdp-tab-stock"
                    data-testid="pdp-tab-stock"
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
                    data-test="pdp-tab-reviews"
                    data-testid="pdp-tab-reviews"
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
                              data-test={`pdp-size-${sz}`}
                              data-testid={`pdp-size-${sz}`}
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
                              data-test={`pdp-color-${clr.name}`}
                              data-testid={`pdp-color-${clr.name}`}
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
                              data-test={`pdp-variant-${v.id}`}
                              data-testid={`pdp-variant-${v.id}`}
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
                            data-test={`pdp-store-stock-${st.storeId}`}
                            data-testid={`pdp-store-stock-${st.storeId}`}
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
                    <form
                      data-test="review-form"
                      data-testid="review-form"
                      onSubmit={handleReviewSubmit}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200"
                    >
                      <h4 className="text-xs font-bold text-slate-900 mb-2">Write a Customer Review</h4>
                      {reviewSuccessMessage && (
                        <div
                          data-test="review-success-message"
                          data-testid="review-success-message"
                          className="mb-3 p-2.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-1.5"
                        >
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
                                data-test={`review-rating-star-${star}`}
                                data-testid={`review-rating-star-${star}`}
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
                          data-test="review-name-input"
                          data-testid="review-name-input"
                          placeholder="Your Name (e.g. Jane D.)"
                          value={reviewName}
                          onChange={e => setReviewName(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                          required
                        />

                        <textarea
                          rows={2}
                          data-test="review-comment-input"
                          data-testid="review-comment-input"
                          placeholder="Share details of your experience with this item..."
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                          required
                        />

                        <button
                          type="submit"
                          data-test="review-submit-button"
                          data-testid="review-submit-button"
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
                          <div
                            key={rev.id}
                            data-test={`review-item-${rev.id}`}
                            data-testid={`review-item-${rev.id}`}
                            className="p-3.5 rounded-xl border border-slate-100 bg-white"
                          >
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
                    data-test="pdp-qty-decrease"
                    data-testid="pdp-qty-decrease"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    title="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span
                    data-test="pdp-qty-display"
                    data-testid="pdp-qty-display"
                    className="w-10 text-center font-extrabold text-sm text-slate-900"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    data-test="pdp-qty-increase"
                    data-testid="pdp-qty-increase"
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
                  data-test="pdp-add-to-cart"
                  data-testid="pdp-add-to-cart"
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
                  data-test="pdp-buy-now"
                  data-testid="pdp-buy-now"
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

      {/* DEDICATED SOCIAL MEDIA SHARE MODAL */}
      {isShareOpen && (
        <div
          data-test="share-modal"
          data-testid="share-modal"
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsShareOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Share this Product</h3>
                  <p className="text-[11px] text-slate-400">Share with friends &amp; family across social networks</p>
                </div>
              </div>
              <button
                type="button"
                data-test="share-modal-close"
                data-testid="share-modal-close"
                onClick={() => setIsShareOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product Card Preview inside Share Modal */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <img
                src={images[0]}
                alt={product.title}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider block">
                  {product.subcategory}
                </span>
                <p className="font-bold text-xs text-slate-900 truncate">{product.title}</p>
                <p className="text-xs font-black text-slate-900 mt-0.5">${product.price.toFixed(2)}</p>
              </div>
            </div>

            {/* Social Media Grid */}
            <div className="mt-5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Share to Social Platforms:
              </p>
              <div className="grid grid-cols-4 gap-2.5">
                {sharePlatforms.map(platform => (
                  <button
                    key={platform.name}
                    type="button"
                    data-test={`share-platform-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    data-testid={`share-platform-${platform.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => {
                      window.open(platform.url, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer group"
                    title={`Share to ${platform.name}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${platform.bg} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}
                    >
                      {platform.icon}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 text-center truncate w-full">
                      {platform.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Copy Product Direct URL */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Direct Product Link:
              </label>
              <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="text"
                  data-test="share-link-input"
                  data-testid="share-link-input"
                  readOnly
                  value={productUrl}
                  className="flex-1 bg-transparent px-2 text-xs text-slate-700 outline-none truncate font-mono select-all"
                />
                <button
                  type="button"
                  data-test="share-copy-button"
                  data-testid="share-copy-button"
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Anyone with this URL will immediately see this product&apos;s details.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
