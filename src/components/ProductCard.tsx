import { Check, Eye, Heart, Plus, Star } from 'lucide-react';
import React, { useState } from 'react';
import { useCart } from '../context/CartContext.js';
import { useWishlist } from '../context/WishlistContext.js';
import { Product } from '../types.js';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);
  const [addedRecently, setAddedRecently] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isFavorited = isInWishlist(product.id);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdding(true);
    const variant = product.variants?.[0]?.name;
    const color = product.colorOptions?.[0]?.name;
    const size = product.sizeOptions?.[0];

    const res = await addToCart(product.id, 1, {
      selectedVariant: variant,
      selectedColor: color,
      selectedSize: size,
    });

    setAdding(false);
    if (res.success) {
      setAddedRecently(true);
      setTimeout(() => setAddedRecently(false), 2000);
    }
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  const discountPercent = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  const categoryTheme = {
    fashion: { badge: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Fashion' },
    electronics: { badge: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Electronics' },
    audio: { badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Audio' },
    beauty: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Beauty & Scent' },
  }[product.category] || { badge: 'bg-slate-50 text-slate-700 border-slate-200', label: 'Product' };

  return (
    <div
      data-test={`product-card-${product.id}`}
      data-testid={`product-card-${product.id}`}
      onClick={() => onSelect(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Top Image Container */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
        <img
          src={isHovered && product.images[1] ? product.images[1] : product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Category & Discount Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${categoryTheme.badge} backdrop-blur-xs bg-white/95 shadow-2xs`}>
            {product.subcategory}
          </span>
          {discountPercent && discountPercent > 0 && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
              {discountPercent}% OFF
            </span>
          )}
          {product.featured && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
              Bestseller
            </span>
          )}
        </div>

        {/* Wishlist Heart Toggle */}
        <button
          type="button"
          data-test={`product-wishlist-${product.id}`}
          data-testid={`product-wishlist-${product.id}`}
          onClick={handleToggleWishlist}
          className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isFavorited
              ? 'bg-rose-50 text-rose-600 shadow-md ring-2 ring-rose-500/30'
              : 'bg-white/90 hover:bg-white text-slate-500 hover:text-rose-600 shadow-xs'
          }`}
          title={isFavorited ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Quick View Button on Hover */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span
            data-test={`product-quickview-${product.id}`}
            data-testid={`product-quickview-${product.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/95 text-slate-900 text-xs font-semibold shadow-md backdrop-blur-xs"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" /> Quick View
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Rating & Stock */}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div
              data-test={`product-rating-${product.id}`}
              data-testid={`product-rating-${product.id}`}
              className="flex items-center gap-1 text-amber-500 font-semibold"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
              <span>{product.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({product.reviewsCount})</span>
            </div>

            <span
              data-test={`product-stock-${product.id}`}
              data-testid={`product-stock-${product.id}`}
              className={`text-[11px] font-semibold ${product.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}
            >
              {product.stock <= 5 ? `Only ${product.stock} left!` : 'In Stock'}
            </span>
          </div>

          {/* Title */}
          <h3
            data-test={`product-title-${product.id}`}
            data-testid={`product-title-${product.id}`}
            className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors"
          >
            {product.title}
          </h3>

          {/* Color swatches preview if available */}
          {product.colorOptions && product.colorOptions.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {product.colorOptions.map((clr, i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full border border-black/15"
                  style={{ backgroundColor: clr.hex }}
                  title={clr.name}
                />
              ))}
              <span className="text-[10px] text-slate-400 ml-1">
                {product.colorOptions.length} colors
              </span>
            </div>
          )}

          {/* Category specific snippet */}
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
            {product.category === 'fashion' && product.specifications?.['Material']
              ? product.specifications['Material']
              : product.category === 'electronics' && product.specifications?.['Processor']
              ? product.specifications['Processor']
              : product.category === 'audio' && product.specifications?.['Active Noise Cancellation']
              ? product.specifications['Active Noise Cancellation']
              : product.category === 'beauty' && product.scentNotes?.top && Array.isArray(product.scentNotes.top) && product.scentNotes.top.length > 0
              ? `Top notes: ${product.scentNotes.top.slice(0, 2).join(', ')}`
              : product.description}
          </p>
        </div>

        {/* Footer: Price & Add button */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span
                data-test={`product-price-${product.id}`}
                data-testid={`product-price-${product.id}`}
                className="text-base font-extrabold text-slate-900"
              >
                ${product.price.toFixed(2)}
              </span>
              {product.compareAtPrice && (
                <span
                  data-test={`product-compare-price-${product.id}`}
                  data-testid={`product-compare-price-${product.id}`}
                  className="text-xs text-slate-400 line-through"
                >
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
            </div>
            {product.compareAtPrice && (
              <span className="text-[10px] font-bold text-emerald-600">
                Save ${(product.compareAtPrice - product.price).toFixed(2)}
              </span>
            )}
          </div>

          <button
            data-test={`product-add-to-cart-${product.id}`}
            data-testid={`product-add-to-cart-${product.id}`}
            onClick={handleQuickAdd}
            disabled={adding}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
              addedRecently
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-900 hover:bg-indigo-600 text-white shadow-xs hover:shadow-indigo-500/20 active:scale-95'
            }`}
            title="Add to cart"
          >
            {addedRecently ? (
              <Check className="w-4 h-4" />
            ) : adding ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
