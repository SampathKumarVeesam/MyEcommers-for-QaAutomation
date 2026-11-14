import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Basket, BasketItem } from '../types.js';
import { useAuth } from './AuthContext.js';
import { apiUrl } from '../config/api.js';

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

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [basketId, setBasketId] = useState<string | null>(null);
  const [basket, setBasket] = useState<Basket | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hasMergedRef = useRef(false);

  // Initialize or fetch basket strictly from PostgreSQL
  const fetchCartFromDatabase = async (currentBasketId?: string | null) => {
    setIsLoading(true);
    try {
      if (user?.id) {
        // Authenticated customer: 100% of cart state is tied to user_id in PostgreSQL public.cart
        const res = await fetch(apiUrl(`/api/carts/user/${user.id}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setBasketId(json.data.id);
            setBasket(json.data);
            return;
          }
        }
      }

      // Guest / Anonymous session in PostgreSQL
      const activeId = currentBasketId || basketId;
      if (activeId) {
        const res = await fetch(apiUrl(`/api/carts/${activeId}`));
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setBasketId(activeId);
            setBasket(json.data);
            return;
          }
        }
      }

      // If no basket exists, initialize a new basket session in PostgreSQL
      const createRes = await fetch(apiUrl('/api/carts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      if (createRes.ok) {
        const createJson = await createRes.json();
        if (createJson.success && createJson.data?.basketId) {
          setBasketId(createJson.data.basketId);
          setBasket(createJson.data.basket);
        }
      }
    } catch (err) {
      console.error('Failed to load cart from PostgreSQL:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync cart when user signs in or out
  useEffect(() => {
    if (user?.id && basketId && !hasMergedRef.current) {
      // Merge guest cart items into logged-in user in PostgreSQL
      fetch(apiUrl('/api/carts/merge'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ basketId, userId: user.id }),
      })
        .then(res => res.json())
        .then(json => {
          hasMergedRef.current = true;
          if (json.success && json.data) {
            setBasket(json.data);
            setBasketId(json.data.id);
          } else {
            fetchCartFromDatabase();
          }
        })
        .catch(() => fetchCartFromDatabase());
    } else {
      fetchCartFromDatabase();
    }
  }, [user?.id]);

  const addToCart = async (
    productId: string,
    quantity = 1,
    options?: { selectedVariant?: string; selectedColor?: string; selectedSize?: string }
  ): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      let activeBasketId = basketId;
      if (!activeBasketId) {
        const res = await fetch(apiUrl('/api/carts'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id }),
        });
        const json = await res.json();
        if (json.success && json.data?.basketId) {
          activeBasketId = json.data.basketId;
          setBasketId(activeBasketId);
        }
      }

      if (!activeBasketId) {
        return { success: false, message: 'Could not connect to PostgreSQL cart' };
      }

      const res = await fetch(apiUrl(`/api/carts/${activeBasketId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productId,
          quantity,
          selectedVariant: options?.selectedVariant,
          selectedColor: options?.selectedColor,
          selectedSize: options?.selectedSize,
          userId: user?.id,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setBasket(json.data);
        return { success: true, message: json.message || 'Item added to cart in PostgreSQL' };
      }

      return { success: false, message: json.message || 'Failed to add item to PostgreSQL cart' };
    } catch (err: any) {
      console.error('Failed to add to cart in PostgreSQL:', err);
      return { success: false, message: err.message || 'Database error adding to cart' };
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
      const res = await fetch(apiUrl(`/api/carts/${basketId}/items/${productId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          quantity,
          selectedVariant: options?.selectedVariant,
          userId: user?.id,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setBasket(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to update cart quantity in PostgreSQL:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (productId: string, variant?: string) => {
    if (!basketId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('productId', productId);
      if (variant) params.append('variant', variant);
      if (user?.id) params.append('userId', String(user.id));

      const res = await fetch(apiUrl(`/api/carts/${basketId}?${params.toString()}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.status === 204 || res.ok) {
        await fetchCartFromDatabase(basketId);
      }
    } catch (err) {
      console.error('Failed to remove item from cart in PostgreSQL:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!basketId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.id) params.append('userId', String(user.id));

      const res = await fetch(apiUrl(`/api/carts/${basketId}?${params.toString()}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.status === 204 || res.ok) {
        await fetchCartFromDatabase(basketId);
      }
    } catch (err) {
      console.error('Failed to clear cart in PostgreSQL:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBasket = async () => {
    await fetchCartFromDatabase(basketId);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

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
        openCart,
        closeCart,
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
