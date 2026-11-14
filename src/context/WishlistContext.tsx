import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '../types.js';
import { useAuth } from './AuthContext.js';
import { apiUrl } from '../config/api.js';

interface WishlistContextType {
  wishlist: Product[];
  wishlistCount: number;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isWishlistOpen: boolean;
  openWishlist: () => void;
  closeWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // Load wishlist from PostgreSQL public.wishlist
  useEffect(() => {
    if (!token) {
      setWishlist([]);
      return;
    }

    fetch(apiUrl('/api/wishlist'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setWishlist(json.data);
        }
      })
      .catch(err => console.error('Failed to load wishlist from PostgreSQL:', err));
  }, [user?.id, token]);

  const isInWishlist = (productId: string) => {
    return wishlist.some(p => p.id === productId);
  };

  const toggleWishlist = async (product: Product): Promise<boolean> => {
    const exists = isInWishlist(product.id);
    if (exists) {
      await removeFromWishlist(product.id);
      return false;
    } else {
      if (token) {
        try {
          const res = await fetch(apiUrl('/api/wishlist'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ productId: product.id }),
          });
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setWishlist(json.data);
            return true;
          }
        } catch (err) {
          console.error('Failed to add to wishlist in PostgreSQL:', err);
        }
      }
      setWishlist(prev => [product, ...prev]);
      return true;
    }
  };

  const removeFromWishlist = async (productId: string) => {
    setWishlist(prev => prev.filter(p => p.id !== productId));
    if (token) {
      try {
        const res = await fetch(apiUrl(`/api/wishlist/${productId}`), {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setWishlist(json.data);
        }
      } catch (err) {
        console.error('Failed to remove from wishlist in PostgreSQL:', err);
      }
    }
  };

  const clearWishlist = async () => {
    setWishlist([]);
    if (token) {
      try {
        await fetch(apiUrl('/api/wishlist'), {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error('Failed to clear wishlist in PostgreSQL:', err);
      }
    }
  };

  const openWishlist = () => setIsWishlistOpen(true);
  const closeWishlist = () => setIsWishlistOpen(false);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        isWishlistOpen,
        openWishlist,
        closeWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
