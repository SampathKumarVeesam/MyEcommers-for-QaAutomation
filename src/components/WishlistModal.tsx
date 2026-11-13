import { Heart, ShoppingBag, Trash2, X } from 'lucide-react';
import React from 'react';
import { useCart } from '../context/CartContext.js';
import { useWishlist } from '../context/WishlistContext.js';
import { Product } from '../types.js';

interface WishlistModalProps {
  onSelectProduct: (product: Product) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({ onSelectProduct }) => {
  const { wishlist, isWishlistOpen, closeWishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart, openCart } = useCart();

  if (!isWishlistOpen) return null;

  const handleMoveToCart = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const variant = product.variants?.[0]?.name;
    const color = product.colorOptions?.[0]?.name;
    const size = product.sizeOptions?.[0];

    await addToCart(product.id, 1, {
      selectedVariant: variant,
      selectedColor: color,
      selectedSize: size,
    });
    removeFromWishlist(product.id);
    closeWishlist();
    openCart();
  };

  return (
    <div
      data-test="wishlist-drawer-overlay"
      data-testid="wishlist-drawer-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      <div
        data-test="wishlist-modal"
        data-testid="wishlist-modal"
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Heart className="w-4 h-4 fill-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Wishlist</h2>
              <p data-test="wishlist-total-count" data-testid="wishlist-total-count" className="text-xs text-slate-500">
                {wishlist.length} {wishlist.length === 1 ? 'saved item' : 'saved items'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wishlist.length > 0 && (
              <button
                data-test="wishlist-clear-all"
                data-testid="wishlist-clear-all"
                onClick={clearWishlist}
                className="text-xs text-slate-400 hover:text-rose-600 transition-colors px-2 py-1 cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              data-test="wishlist-close-button"
              data-testid="wishlist-close-button"
              onClick={closeWishlist}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100">
          {wishlist.length === 0 ? (
            <div data-test="wishlist-empty-message" data-testid="wishlist-empty-message" className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-3">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Your wishlist is empty</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Tap the heart icon on any product to save your favorite items and track their price.
              </p>
              <button
                data-test="wishlist-explore-button"
                data-testid="wishlist-explore-button"
                onClick={closeWishlist}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Explore Products
              </button>
            </div>
          ) : (
            wishlist.map(product => (
              <div
                key={product.id}
                data-test={`wishlist-item-${product.id}`}
                data-testid={`wishlist-item-${product.id}`}
                onClick={() => {
                  closeWishlist();
                  onSelectProduct(product);
                }}
                className="py-4 flex gap-3 group cursor-pointer hover:bg-slate-50/50 p-2 rounded-xl transition-colors"
              >
                <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {product.subcategory}
                      </span>
                      <button
                        data-test={`wishlist-remove-${product.id}`}
                        data-testid={`wishlist-remove-${product.id}`}
                        onClick={e => {
                          e.stopPropagation();
                          removeFromWishlist(product.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {product.title}
                    </h4>

                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm font-extrabold text-slate-900">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-[11px] text-slate-400 line-through">
                          ${product.compareAtPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    data-test={`wishlist-move-to-cart-${product.id}`}
                    data-testid={`wishlist-move-to-cart-${product.id}`}
                    onClick={e => handleMoveToCart(product, e)}
                    className="mt-2 w-full py-1.5 px-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Move to Cart</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {wishlist.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <p className="text-center text-xs text-slate-500">
              Items in your wishlist are saved on this browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

