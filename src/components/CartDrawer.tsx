import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { useCart } from '../context/CartContext.js';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const {
    isCartOpen,
    closeCart,
    items,
    totalItemCount,
    subtotal,
    estimatedTax,
    shippingFee,
    grandTotal,
    updateQuantity,
    removeItem,
    clearCart,
    isLoading,
  } = useCart();

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number; freeShipping?: boolean } | null>(null);
  const [promoError, setPromoError] = useState('');

  if (!isCartOpen) return null;

  const freeShippingThreshold = 50;
  const effectiveShipping = appliedPromo?.freeShipping ? 0 : shippingFee;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const diffToFree = Math.max(0, freeShippingThreshold - subtotal);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    applyCoupon(promoCode);
  };

  const applyCoupon = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    if (trimmed === 'SPHERE20') {
      setAppliedPromo({ code: 'SPHERE20', percent: 20 });
      setPromoCode('SPHERE20');
      setPromoError('');
    } else if (trimmed === 'SUMMER50') {
      setAppliedPromo({ code: 'SUMMER50', percent: 50 });
      setPromoCode('SUMMER50');
      setPromoError('');
    } else if (trimmed === 'WELCOME10' || trimmed === 'TESTER10') {
      setAppliedPromo({ code: trimmed, percent: 10 });
      setPromoCode(trimmed);
      setPromoError('');
    } else if (trimmed === 'FREESHIP') {
      setAppliedPromo({ code: 'FREESHIP', percent: 0, freeShipping: true });
      setPromoCode('FREESHIP');
      setPromoError('');
    } else {
      setPromoError('Invalid coupon. Try SPHERE20 or SUMMER50');
    }
  };

  const discountAmount = appliedPromo
    ? parseFloat((subtotal * (appliedPromo.percent / 100)).toFixed(2))
    : 0;

  const finalGrandTotal = Math.max(
    0,
    parseFloat((subtotal - discountAmount + estimatedTax + (diffToFree === 0 ? 0 : effectiveShipping)).toFixed(2))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Shopping Basket</h2>
              <p className="text-xs text-slate-500">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in cart
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-rose-600 transition-colors px-2 py-1 cursor-pointer"
                title="Empty basket"
              >
                Clear All
              </button>
            )}
            <button
              onClick={closeCart}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Free Shipping Progress */}
        <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            <span className="flex items-center gap-1.5 text-indigo-900">
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              {diffToFree === 0 || appliedPromo?.freeShipping ? (
                <span className="text-emerald-700 font-bold">🎉 Unlocked Free Express Shipping!</span>
              ) : (
                <span>
                  Add <strong className="text-indigo-700 font-bold">${diffToFree.toFixed(2)}</strong> for Free Shipping
                </span>
              )}
            </span>
            <span className="text-indigo-600 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-indigo-200/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${diffToFree === 0 || appliedPromo?.freeShipping ? 'bg-emerald-500' : 'bg-indigo-600'}`}
              style={{ width: `${appliedPromo?.freeShipping ? 100 : progressPercent}%` }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <ShoppingBag className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Your basket is empty</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Explore our collections of dresses, smartphones, audio devices, and fragrances.
              </p>
              <button
                onClick={closeCart}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="py-4 flex gap-3 group">
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.product.title}
                      </h4>
                      <button
                        onClick={() => removeItem(item.productId, item.selectedVariant)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Variant/Color/Size tags */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.selectedVariant && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {item.selectedVariant}
                        </span>
                      )}
                      {item.selectedSize && (
                        <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          Size: {item.selectedSize}
                        </span>
                      )}
                      {item.selectedColor && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {item.selectedColor}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity and Price */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1, {
                            selectedVariant: item.selectedVariant,
                            selectedColor: item.selectedColor,
                            selectedSize: item.selectedSize,
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1, {
                            selectedVariant: item.selectedVariant,
                            selectedColor: item.selectedColor,
                            selectedSize: item.selectedSize,
                          })
                        }
                        className="p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                      {item.quantity > 1 && (
                        <p className="text-[10px] text-slate-400">
                          ${item.unitPrice.toFixed(2)} each
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer: Financial breakdown & Checkout */}
        {items.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
            {/* Promo Code Suggestion Pill */}
            {!appliedPromo && (
              <button
                type="button"
                onClick={() => applyCoupon('SPHERE20')}
                className="w-full text-left p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200/80 text-[11px] text-indigo-900 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Click to apply <strong>SPHERE20</strong> for 20% OFF</span>
                </span>
                <span className="font-bold text-indigo-600 text-xs">Apply</span>
              </button>
            )}

            {/* Promo Code Form */}
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Coupon code (e.g. SPHERE20, SUMMER50)"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value)}
                  disabled={Boolean(appliedPromo)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white text-xs text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>
              {appliedPromo ? (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoCode('');
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Remove
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!promoCode.trim()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Apply
                </button>
              )}
            </form>
            {appliedPromo && (
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Coupon {appliedPromo.code} applied ({appliedPromo.percent}% discount)
              </p>
            )}
            {promoError && (
              <p className="text-[11px] text-rose-600 font-medium">{promoError}</p>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal ({totalItemCount} items)</span>
                <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              {appliedPromo && discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount ({appliedPromo.percent}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Tax (8.25%)</span>
                <span>${estimatedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {diffToFree === 0 || appliedPromo?.freeShipping ? (
                    <strong className="text-emerald-600">FREE</strong>
                  ) : (
                    `$${shippingFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="text-base text-indigo-700">${finalGrandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Action */}
            <button
              onClick={() => {
                closeCart();
                onProceedToCheckout();
              }}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
