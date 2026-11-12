import {
  Check,
  CheckCircle2,
  ChevronRight,
  Heart,
  MessageSquare,
  Minus,
  Plus,
  RotateCcw,
  Send,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  User,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { useWishlist } from '../context/WishlistContext.js';
import { Product, Review } from '../types.js';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenCheckout?: () => void;
  onProductUpdated?: (updatedProduct: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onProductUpdated,
}) => {
  const { addToCart, openCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();

  const [selectedImage, setSelectedImage] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(product?.sizeOptions?.[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product?.colorOptions?.[0]?.name);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(product?.variants?.[0]?.name);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Reviews state
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewName, setReviewName] = useState(user?.name || '');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setSelectedImage(0);
      setQuantity(1);
      setSelectedSize(product.sizeOptions?.[0]);
      setSelectedColor(product.colorOptions?.[0]?.name);
      setSelectedVariant(product.variants?.[0]?.name);
      fetchReviews(product.id);
    }
  }, [product]);

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
          setReviewSuccessMessage('Thank you! Your verified review was published.');
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          {/* Left Column: Image Gallery & Badges */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square w-full rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
              <img
                src={product.images[selectedImage] || product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover object-center"
              />
              <span className="absolute top-3 left-3 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/95 text-slate-900 shadow-xs backdrop-blur-xs border border-slate-200">
                {product.subcategory}
              </span>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedImage === idx
                        ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust Badges */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Free shipping over $50</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-600" />
                <span>30-Day Easy Returns</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>100% Authentic Guaranteed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>2-Year Official Warranty</span>
              </div>
            </div>
          </div>

          {/* Right Column: Product Details & Controls */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Category Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-2">
                <span className="capitalize">{product.category}</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-700 font-semibold">{product.subcategory}</span>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {product.title}
              </h1>

              {/* Rating & Reviews */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-amber-500 text-sm font-semibold">
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-slate-400">•</span>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className="text-xs text-indigo-600 font-medium underline hover:text-indigo-800 cursor-pointer"
                >
                  {reviews.length > 0 ? `${reviews.length} verified reviews` : `${product.reviewsCount} customer reviews`}
                </button>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-emerald-600">
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                </span>
              </div>

              {/* Price Row */}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-slate-900">
                  ${product.price.toFixed(2)}
                </span>
                {product.compareAtPrice && (
                  <span className="text-base text-slate-400 line-through">
                    ${product.compareAtPrice.toFixed(2)}
                  </span>
                )}
                {product.compareAtPrice && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Save {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
                  </span>
                )}
              </div>

              {/* Tab Selector: Product Specs vs Customer Reviews */}
              <div className="mt-4 flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-2 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'details'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Overview &amp; Specs
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'reviews'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Customer Reviews ({reviews.length})</span>
                </button>
              </div>

              {/* TAB 1: PRODUCT DETAILS */}
              {activeTab === 'details' && (
                <div className="mt-4 space-y-4">
                  {/* Description */}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Fashion Sizing Options */}
                  {product.sizeOptions && product.sizeOptions.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-2">
                        Select Size: <span className="font-normal text-indigo-600">{selectedSize}</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {product.sizeOptions.map(sz => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(sz)}
                            className={`min-w-10 h-10 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              selectedSize === sz
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 text-slate-700 hover:border-slate-300'
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
                        Color: <span className="font-normal text-indigo-600">{selectedColor}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {product.colorOptions.map(clr => (
                          <button
                            key={clr.name}
                            type="button"
                            onClick={() => setSelectedColor(clr.name)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                              selectedColor === clr.name
                                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-2xs'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: clr.hex }}
                            />
                            <span>{clr.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Electronics Hardware Variants */}
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
                            className={`text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                              selectedVariant === v.name
                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-1 ring-indigo-600'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <p className="font-semibold">{v.name}</p>
                              <p className="text-[11px] text-slate-500">SKU: {v.sku}</p>
                            </div>
                            <span className="font-bold text-slate-900">
                              {v.priceDelta > 0 ? `+$${v.priceDelta}` : 'Included'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Beauty Scent Pyramid */}
                  {product.scentNotes && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Fragrance Olfactory Pyramid:</span>
                      </div>
                      <div className="space-y-1">
                        <div>
                          <strong className="text-amber-800">Top Notes:</strong>{' '}
                          <span className="text-slate-700">{product.scentNotes.top.join(', ')}</span>
                        </div>
                        <div>
                          <strong className="text-amber-800">Heart Notes:</strong>{' '}
                          <span className="text-slate-700">{product.scentNotes.heart.join(', ')}</span>
                        </div>
                        <div>
                          <strong className="text-amber-800">Base Notes:</strong>{' '}
                          <span className="text-slate-700">{product.scentNotes.base.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Technical Specifications */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Technical Specifications:
                    </h4>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
                      {Object.entries(product.specifications).map(([key, val]) => (
                        <div key={key} className="grid grid-cols-3 p-2 bg-white even:bg-slate-50/60">
                          <span className="font-semibold text-slate-600 col-span-1">{key}</span>
                          <span className="text-slate-800 col-span-2 font-mono text-[11px]">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: REVIEWS */}
              {activeTab === 'reviews' && (
                <div className="mt-4 space-y-4">
                  {/* Write a Review Box */}
                  <form onSubmit={handleReviewSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900 mb-2">Write a Customer Review</h4>
                    {reviewSuccessMessage && (
                      <div className="mb-3 p-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5">
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
                        placeholder="Your Name (e.g. Rachel S.)"
                        value={reviewName}
                        onChange={e => setReviewName(e.target.value)}
                        className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 outline-none focus:border-indigo-500"
                        required
                      />

                      <textarea
                        rows={2}
                        placeholder="Share your experience with this product..."
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 outline-none focus:border-indigo-500"
                        required
                      />

                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>{submittingReview ? 'Submitting...' : 'Post Review'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Reviews List */}
                  {loadingReviews ? (
                    <div className="py-6 text-center text-xs text-slate-400">Loading reviews...</div>
                  ) : reviews.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No reviews yet. Be the first to review this product!
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {reviews.map(rev => (
                        <div key={rev.id} className="p-3 rounded-xl border border-slate-100 bg-white">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
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
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{rev.comment}</p>
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

            {/* Actions: Quantity Stepper, Wishlist & Add to Cart */}
            <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              {/* Stepper */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-bold text-sm text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => q + 1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className={`p-3 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                  isFavorited
                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
                title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>

              {/* Add to Basket button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding}
                className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  addedSuccess
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 active:scale-98'
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

              {/* View Cart button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openCart();
                }}
                className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                View Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
