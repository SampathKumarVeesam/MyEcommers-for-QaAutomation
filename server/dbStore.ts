import crypto from 'node:crypto';
import { Basket, BasketItem, Order, Product, Review, User } from '../src/types.js';
import { INITIAL_PRODUCTS, INITIAL_USERS } from './seedData.js';

class DatabaseStore {
  private users: Map<string, User> = new Map();
  private products: Map<string, Product> = new Map();
  private baskets: Map<string, Basket> = new Map();
  private orders: Map<string, Order> = new Map();
  private reviews: Map<string, Review[]> = new Map();

  constructor() {
    this.resetSeedData();
  }

  public resetSeedData(): void {
    this.users.clear();
    this.products.clear();
    this.baskets.clear();
    this.orders.clear();

    for (const u of INITIAL_USERS) {
      this.users.set(u.id, { ...u });
    }

    for (const p of INITIAL_PRODUCTS) {
      this.products.set(p.id, { ...p });
    }

    // Seed one sample order for Customer 1 to demonstrate order history
    const sampleProduct = INITIAL_PRODUCTS[0];
    const sampleOrderId = 'ord_seed_1001';
    const sampleBasketId = 'basket_seed_demo';
    const sampleBasketItem: BasketItem = {
      id: 'bitem_demo_1',
      productId: sampleProduct.id,
      product: sampleProduct,
      quantity: 1,
      unitPrice: sampleProduct.price,
      totalPrice: sampleProduct.price,
      selectedVariant: 'Size: M / Color: Emerald Green',
      selectedColor: 'Emerald Green',
      selectedSize: 'M',
    };

    const order: Order = {
      id: sampleOrderId,
      orderNumber: 'ORD-782910-QA',
      userId: 'user_cust_001',
      userEmail: 'customer@practicesoftwaretesting.com',
      userName: 'Jane Customer (User 1)',
      basketId: sampleBasketId,
      items: [sampleBasketItem],
      shippingAddress: {
        fullName: 'Jane Customer',
        street: '742 Evergreen Terrace',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        country: 'United States',
        phone: '+1 (555) 482-9102',
      },
      shippingMethod: 'express',
      paymentMethod: 'credit_card',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      subtotal: sampleProduct.price,
      tax: parseFloat((sampleProduct.price * 0.0825).toFixed(2)),
      shippingFee: 0,
      grandTotal: parseFloat((sampleProduct.price * 1.0825).toFixed(2)),
      trackingNumber: 'TRK-USPS-8291047291',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    };
    this.orders.set(sampleOrderId, order);

    // Seed realistic verified customer reviews
    this.reviews.clear();
    const seedReviews: Review[] = [
      {
        id: 'rev_001',
        productId: 'prod_fash_01',
        userName: 'Sophia M.',
        rating: 5,
        comment: 'Absolutely stunning dress! The silk fabric drape is top notch and the emerald green color is even richer in person.',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        verifiedPurchase: true,
      },
      {
        id: 'rev_002',
        productId: 'prod_fash_01',
        userName: 'Elena R.',
        rating: 5,
        comment: 'Wore this to a gala dinner and received so many compliments. Fits true to size and feels very luxurious.',
        createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
        verifiedPurchase: true,
      },
      {
        id: 'rev_003',
        productId: 'prod_elec_01',
        userName: 'David K.',
        rating: 5,
        comment: 'The Snapdragon 8 Gen 3 performance is blistering fast. The 2K 120Hz display is the best I have ever used.',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        verifiedPurchase: true,
      },
      {
        id: 'rev_004',
        productId: 'prod_elec_01',
        userName: 'Marcus T.',
        rating: 4,
        comment: 'Camera quality is phenomenal in low light. Battery lasts 1.5 days easily with heavy usage.',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        verifiedPurchase: true,
      },
      {
        id: 'rev_005',
        productId: 'prod_audio_01',
        userName: 'Liam P.',
        rating: 5,
        comment: 'Best ANC earbuds on the market. 48dB noise cancellation completely cuts out airplane and subway hum.',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        verifiedPurchase: true,
      },
      {
        id: 'rev_006',
        productId: 'prod_beauty_01',
        userName: 'Amira H.',
        rating: 5,
        comment: 'Smells like high-end Arabian luxury. The oud and amber blend projects beautifully for 10+ hours.',
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
        verifiedPurchase: true,
      },
    ];

    for (const r of seedReviews) {
      const list = this.reviews.get(r.productId) || [];
      list.push(r);
      this.reviews.set(r.productId, list);
    }
  }

  // --- REVIEWS OPERATIONS ---
  public getReviewsForProduct(productId: string): Review[] {
    return (this.reviews.get(productId) || []).map(r => ({ ...r }));
  }

  public addReview(review: Review): Review {
    const list = this.reviews.get(review.productId) || [];
    list.unshift(review);
    this.reviews.set(review.productId, list);

    // Update product rating and reviewsCount
    const product = this.products.get(review.productId);
    if (product) {
      const allRatings = list.map(r => r.rating);
      const avg = allRatings.reduce((sum, val) => sum + val, 0) / allRatings.length;
      product.rating = parseFloat(avg.toFixed(1));
      product.reviewsCount = list.length;
      this.products.set(product.id, product);
    }

    return { ...review };
  }

  // --- USER OPERATIONS ---
  public findUserByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return undefined;
  }

  public findUserById(id: string): User | undefined {
    const user = this.users.get(id);
    return user ? { ...user } : undefined;
  }

  public createUser(user: User): User {
    this.users.set(user.id, { ...user });
    return { ...user };
  }

  public listUsers(): User[] {
    return Array.from(this.users.values()).map(u => ({ ...u }));
  }

  // --- PRODUCT OPERATIONS ---
  public getProducts(params: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }): { products: Product[]; total: number; page: number; totalPages: number } {
    let list = Array.from(this.products.values());

    if (params.category && params.category !== 'all') {
      const cat = params.category.toLowerCase();
      // Allow category match either by category field or subcategory (e.g., 'dresses', 'mobiles')
      list = list.filter(p =>
        p.category.toLowerCase() === cat ||
        p.subcategory.toLowerCase() === cat ||
        p.tags.some(t => t.toLowerCase() === cat)
      );
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        Object.values(p.specifications).some(val => val.toLowerCase().includes(q))
      );
    }

    if (typeof params.minPrice === 'number' && !isNaN(params.minPrice)) {
      list = list.filter(p => p.price >= params.minPrice!);
    }
    if (typeof params.maxPrice === 'number' && !isNaN(params.maxPrice)) {
      list = list.filter(p => p.price <= params.maxPrice!);
    }

    // Sorting
    switch (params.sort) {
      case 'price_asc':
      case 'price-asc':
      case 'low-to-high':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
      case 'price-desc':
      case 'high-to-low':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
      default:
        // Featured first, then alphabetical/stable
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    const total = list.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 12));
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return {
      products: paginated,
      total,
      page,
      totalPages,
    };
  }

  public getProductById(id: string): Product | undefined {
    const product = this.products.get(id);
    return product ? { ...product } : undefined;
  }

  public createProduct(product: Product): Product {
    this.products.set(product.id, { ...product });
    return { ...product };
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.products.set(id, updated);
    return { ...updated };
  }

  public deleteProduct(id: string): boolean {
    return this.products.delete(id);
  }

  // --- BASKET / CART OPERATIONS ---
  public createBasket(userId?: string): Basket {
    const id = `basket_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const basket: Basket = {
      id,
      userId,
      items: [],
      totalItemCount: 0,
      subtotal: 0,
      estimatedTax: 0,
      shippingFee: 0,
      grandTotal: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.baskets.set(id, basket);
    return { ...basket };
  }

  public getBasket(basketId: string): Basket | undefined {
    const basket = this.baskets.get(basketId);
    if (!basket) return undefined;
    this.recalculateBasket(basket);
    return { ...basket };
  }

  public addOrUpdateBasketItem(
    basketId: string,
    productId: string,
    quantity: number = 1,
    options?: {
      selectedVariant?: string;
      selectedColor?: string;
      selectedSize?: string;
    }
  ): { basket: Basket; message: string } {
    let basket = this.baskets.get(basketId);
    if (!basket) {
      basket = this.createBasket();
      basket.id = basketId;
      this.baskets.set(basketId, basket);
    }

    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product not found with ID ${productId}`);
    }

    // Find if item with same variant/options already exists
    const existingIndex = basket.items.findIndex(item =>
      item.productId === productId &&
      (options?.selectedVariant ? item.selectedVariant === options.selectedVariant : true) &&
      (options?.selectedSize ? item.selectedSize === options.selectedSize : true) &&
      (options?.selectedColor ? item.selectedColor === options.selectedColor : true)
    );

    let message = 'item added or updated';

    if (existingIndex >= 0) {
      basket.items[existingIndex].quantity += quantity;
      basket.items[existingIndex].totalPrice = parseFloat(
        (basket.items[existingIndex].quantity * basket.items[existingIndex].unitPrice).toFixed(2)
      );
      if (basket.items[existingIndex].quantity <= 0) {
        basket.items.splice(existingIndex, 1);
        message = 'item removed from basket';
      }
    } else {
      if (quantity > 0) {
        const unitPrice = product.price;
        const newItem: BasketItem = {
          id: `bitem_${crypto.randomUUID().slice(0, 8)}`,
          productId: product.id,
          product: { ...product },
          quantity,
          unitPrice,
          totalPrice: parseFloat((unitPrice * quantity).toFixed(2)),
          selectedVariant: options?.selectedVariant,
          selectedColor: options?.selectedColor,
          selectedSize: options?.selectedSize,
        };
        basket.items.push(newItem);
        message = 'item added or updated';
      }
    }

    basket.updatedAt = new Date().toISOString();
    this.recalculateBasket(basket);
    return { basket: { ...basket }, message };
  }

  public removeBasketItem(basketId: string, productId: string, variant?: string): Basket | undefined {
    const basket = this.baskets.get(basketId);
    if (!basket) return undefined;

    basket.items = basket.items.filter(item => {
      if (item.productId !== productId) return true;
      if (variant && item.selectedVariant !== variant) return true;
      return false;
    });

    basket.updatedAt = new Date().toISOString();
    this.recalculateBasket(basket);
    return { ...basket };
  }

  public clearBasket(basketId: string): boolean {
    const basket = this.baskets.get(basketId);
    if (!basket) return false;
    basket.items = [];
    basket.totalItemCount = 0;
    basket.subtotal = 0;
    basket.estimatedTax = 0;
    basket.shippingFee = 0;
    basket.grandTotal = 0;
    basket.updatedAt = new Date().toISOString();
    return true;
  }

  private recalculateBasket(basket: Basket): void {
    let count = 0;
    let subtotal = 0;

    for (const item of basket.items) {
      // Refresh current product price if available
      const currentProduct = this.products.get(item.productId);
      if (currentProduct) {
        item.product = { ...currentProduct };
        item.unitPrice = currentProduct.price;
      }
      item.totalPrice = parseFloat((item.quantity * item.unitPrice).toFixed(2));
      count += item.quantity;
      subtotal += item.totalPrice;
    }

    basket.totalItemCount = count;
    basket.subtotal = parseFloat(subtotal.toFixed(2));
    basket.estimatedTax = parseFloat((subtotal * 0.0825).toFixed(2));
    basket.shippingFee = subtotal > 75 || count === 0 ? 0 : 9.99;
    basket.grandTotal = parseFloat((basket.subtotal + basket.estimatedTax + basket.shippingFee).toFixed(2));
  }

  // --- ORDER OPERATIONS ---
  public createOrder(data: {
    userId: string;
    userEmail: string;
    userName: string;
    basketId: string;
    items: BasketItem[];
    shippingAddress: any;
    shippingMethod: 'standard' | 'express' | 'priority';
    paymentMethod: any;
  }): Order {
    const id = `ord_${crypto.randomUUID().slice(0, 10)}`;
    const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}-SP`;
    const trackingNumber = `TRK-${(data.shippingMethod || 'standard').toUpperCase()}-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    let subtotal = 0;
    for (const it of data.items) {
      subtotal += it.totalPrice;
      // Decrement stock
      const prod = this.products.get(it.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - it.quantity);
      }
    }

    const tax = parseFloat((subtotal * 0.0825).toFixed(2));
    const shippingFee = subtotal > 75 ? 0 : data.shippingMethod === 'express' ? 14.99 : 9.99;
    const grandTotal = parseFloat((subtotal + tax + shippingFee).toFixed(2));

    const order: Order = {
      id,
      orderNumber,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      basketId: data.basketId,
      items: data.items.map(it => ({ ...it })),
      shippingAddress: { ...data.shippingAddress },
      shippingMethod: data.shippingMethod,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod === 'cod' ? 'cod_pending' : 'paid',
      orderStatus: 'processing',
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax,
      shippingFee,
      grandTotal,
      trackingNumber,
      createdAt: new Date().toISOString(),
    };

    this.orders.set(id, order);

    // Clear the basket after order placement
    this.clearBasket(data.basketId);

    return { ...order };
  }

  public getOrdersByUser(userId: string): Order[] {
    return Array.from(this.orders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderById(id: string): Order | undefined {
    const order = this.orders.get(id);
    return order ? { ...order } : undefined;
  }

  public getAllOrders(): Order[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const db = new DatabaseStore();
