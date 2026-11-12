import React, { createContext, useContext, useEffect, useState } from 'react';
import { Basket, BasketItem } from '../types.js';

interface CartContextType {
  basketId: string | null;
  basket: Basket | null;
  items: BasketItem[];
  totalItemCount: number;
  subtotal: number;
  estimatedTax: number;
  shippingFee: number;
  grandTotal: number;
  isCartOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (productId: string, quantity?: number, options?: { selectedVariant?: string; selectedColor?: string; selectedSize?: string }) => Promise<{ success: boolean; message: string }>;
  updateQuantity: (productId: string, quantity: number, options?: { selectedVariant?: string; selectedColor?: string; selectedSize?: string }) => Promise<void>;
  removeItem: (productId: string, variant?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshBasket: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const BASKET_ID_KEY = 'shopsphere_basket_id';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [basketId, setBasketId] = useState<string | null>(() => {
    return localStorage.getItem(BASKET_ID_KEY);
  });
  const [basket, setBasket] = useState<Basket | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Safe helper to create a brand new basket
  const createNewBasket = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.basketId) {
          const newId = String(json.data.basketId);
          setBasketId(newId);
          localStorage.setItem(BASKET_ID_KEY, newId);
          setBasket(
            json.data.basket || {
              id: newId,
              items: [],
              totalItemCount: 0,
              subtotal: 0,
              estimatedTax: 0,
              shippingFee: 0,
              grandTotal: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
          return newId;
        }
      }
    } catch (err) {
      console.error('Failed to create new basket:', err);
    }
    return null;
  };

  // Initialize or fetch basket with ZERO recursion
  const initOrFetchBasket = async () => {
    const storedId = localStorage.getItem(BASKET_ID_KEY);

    if (!storedId) {
      return await createNewBasket();
    }

    try {
      const res = await fetch(`/api/carts/${storedId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setBasketId(storedId);
          setBasket({
            id: storedId,
            items: json.data.items || [],
            totalItemCount: json.data.totalItemCount || 0,
            subtotal: json.data.subtotal || 0,
            estimatedTax: json.data.estimatedTax || 0,
            shippingFee: json.data.shippingFee || 0,
            grandTotal: json.data.grandTotal || 0,
            createdAt: json.data.createdAt || new Date().toISOString(),
            updatedAt: json.data.updatedAt || new Date().toISOString(),
          });
          return storedId;
        }
      }

      // If status is 404, 403, or invalid: clean up stale storage and initialize fresh basket
      localStorage.removeItem(BASKET_ID_KEY);
      setBasketId(null);
      return await createNewBasket();
    } catch (err) {
      console.error('Error fetching basket:', err);
      localStorage.removeItem(BASKET_ID_KEY);
      setBasketId(null);
      return await createNewBasket();
    }
  };

  useEffect(() => {
    initOrFetchBasket();
  }, []);

  const refreshBasket = async () => {
    const currentId = basketId || localStorage.getItem(BASKET_ID_KEY);
    if (!currentId) return;
    try {
      const res = await fetch(`/api/carts/${currentId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setBasket({
            id: currentId,
            items: json.data.items || [],
            totalItemCount: json.data.totalItemCount || 0,
            subtotal: json.data.subtotal || 0,
            estimatedTax: json.data.estimatedTax || 0,
            shippingFee: json.data.shippingFee || 0,
            grandTotal: json.data.grandTotal || 0,
            createdAt: json.data.createdAt || new Date().toISOString(),
            updatedAt: json.data.updatedAt || new Date().toISOString(),
          });
        }
      } else if (res.status === 404 || res.status === 403) {
        localStorage.removeItem(BASKET_ID_KEY);
        setBasketId(null);
        await createNewBasket();
      }
    } catch (err) {
      console.error('Failed to refresh basket:', err);
    }
  };

  const addToCart = async (
    productId: string,
    quantity: number = 1,
    options?: { selectedVariant?: string; selectedColor?: string; selectedSize?: string }
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      let activeBasketId = basketId;
      if (!activeBasketId) {
        activeBasketId = (await initOrFetchBasket()) || null;
      }
      if (!activeBasketId) {
        return { success: false, message: 'Could not initialize cart basket' };
      }

      const res = await fetch(`/api/carts/${activeBasketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity,
          selectedVariant: options?.selectedVariant,
          selectedColor: options?.selectedColor,
          selectedSize: options?.selectedSize,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setBasket(json.data);
        return { success: true, message: json.message || 'item added or updated' };
      }

      return { success: false, message: json.message || 'Failed to add item to basket' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Cart connection error' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (
    productId: string,
    quantity: number,
    options?: { selectedVariant?: string; selectedColor?: string; selectedSize?: string }
  ) => {
    if (!basketId) return;
    setIsLoading(true);
    try {
      // Find delta
      const existing = basket?.items.find(
        it =>
          it.productId === productId &&
          (options?.selectedVariant ? it.selectedVariant === options.selectedVariant : true)
      );

      const delta = existing ? quantity - existing.quantity : quantity;

      const res = await fetch(`/api/carts/${basketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: delta,
          selectedVariant: options?.selectedVariant,
          selectedColor: options?.selectedColor,
          selectedSize: options?.selectedSize,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setBasket(json.data);
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (productId: string, variant?: string) => {
    if (!basketId) return;
    setIsLoading(true);
    try {
      let url = `/api/carts/${basketId}?productId=${encodeURIComponent(productId)}`;
      if (variant) {
        url += `&variant=${encodeURIComponent(variant)}`;
      }
      const res = await fetch(url, { method: 'DELETE' });
      if (res.status === 204 || res.ok) {
        await refreshBasket();
      }
    } catch (err) {
      console.error('Error removing item from cart:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!basketId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/carts/${basketId}`, { method: 'DELETE' });
      if (res.status === 204 || res.ok) {
        setBasket(prev => (prev ? { ...prev, items: [], totalItemCount: 0, subtotal: 0, estimatedTax: 0, shippingFee: 0, grandTotal: 0 } : null));
      }
    } catch (err) {
      console.error('Error clearing basket:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        basketId,
        basket,
        items: basket?.items || [],
        totalItemCount: basket?.totalItemCount || 0,
        subtotal: basket?.subtotal || 0,
        estimatedTax: basket?.estimatedTax || 0,
        shippingFee: basket?.shippingFee || 0,
        grandTotal: basket?.grandTotal || 0,
        isCartOpen,
        isLoading,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshBasket,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
};
