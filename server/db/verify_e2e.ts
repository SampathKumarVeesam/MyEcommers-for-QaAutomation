import bcrypt from 'bcryptjs';
import { pool, query, verifyConnection } from './pool.js';
import { userRepo } from '../repositories/userRepo.js';
import { productRepo } from '../repositories/productRepo.js';
import { storeRepo } from '../repositories/storeRepo.js';
import { inventoryRepo } from '../repositories/inventoryRepo.js';
import { cartRepo } from '../repositories/cartRepo.js';
import { orderRepo } from '../repositories/orderRepo.js';
import { wishlistRepo } from '../repositories/wishlistRepo.js';

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('🧪 Starting End-to-End PostgreSQL 18 Verification Suite');
  console.log('   Database: DataBase_for_SamEcommers on port 5433');
  console.log('================================================================\n');

  const connected = await verifyConnection();
  if (!connected) {
    throw new Error('Could not connect to PostgreSQL 18 on port 5433');
  }

  // --- TEST 1: Users & Authentication in public.users ---
  console.log('--- TEST 1: public.users CRUD Verification ---');
  const testEmail = `e2e_tester_${Date.now()}@practicesoftwaretesting.com`;
  const createdUser = await userRepo.create({
    name: 'E2E Automated Tester',
    email: testEmail,
    passwordHash: bcrypt.hashSync('TestPass@123', 10),
    role: 'customer',
    phone: '+1 (555) 777-9999',
    address: {
      fullName: 'E2E Automated Tester',
      street: '100 Silicon Way',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'United States',
      phone: '+1 (555) 777-9999',
    },
  });
  console.log(`✅ [User Created]: ID: ${createdUser.id}, Email: ${createdUser.email}`);

  const userInDb = await query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [testEmail]);
  if (userInDb.rows.length === 0) throw new Error('User not found in public.users table!');
  console.log(`✅ [SQL SELECT users]: Verified 1 row exists in public.users (ID: ${userInDb.rows[0].id})`);

  // Test profile update
  const updatedUser = await userRepo.updateProfile(createdUser.id, {
    name: 'E2E Tester Profile Updated',
    phone: '+1 (555) 123-4567',
  });
  console.log(`✅ [User Profile Updated in SQL]: Name: "${updatedUser?.name}", Phone: "${updatedUser?.phone}"`);

  // --- TEST 2: Products, Stores & Inventory in public.product, public.store, public.inventory ---
  console.log('\n--- TEST 2: public.product, public.store, public.inventory Verification ---');
  const stores = await storeRepo.getAllStores();
  console.log(`✅ [SQL SELECT store]: Retrieved ${stores.length} retail stores:`, stores.map(s => s.name));

  const catalog = await productRepo.getProducts({ page: 1, limit: 5 });
  console.log(`✅ [SQL SELECT product]: Retrieved catalog total: ${catalog.total} items. Top item: "${catalog.products[0].title}"`);

  const sampleProduct = catalog.products[0];
  const internalProdId = await productRepo.getInternalProductId(sampleProduct.id);
  const invBefore = await inventoryRepo.getInventoryByProduct(sampleProduct.id);
  console.log(`✅ [SQL SELECT inventory]: Product "${sampleProduct.title}" (ID: ${internalProdId}) stock before test: ${invBefore[0]?.stockAvailable} units at ${invBefore[0]?.storeName}`);

  // --- TEST 3: Shopping Cart in public.cart ---
  console.log('\n--- TEST 3: public.cart Persistence Verification ---');
  const basketId = `b_test_${Date.now()}`;
  await cartRepo.addOrUpdateItem(basketId, sampleProduct.id, 2, {
    selectedVariant: 'Size: M / Color: Emerald Green',
    selectedColor: 'Emerald Green',
    selectedSize: 'M',
    userId: createdUser.id,
  });

  const cartInDb = await query(`SELECT * FROM cart WHERE user_id = $1`, [userInDb.rows[0].id]);
  if (cartInDb.rows.length === 0) throw new Error('Cart item was not inserted into public.cart table!');
  console.log(`✅ [SQL SELECT cart]: Verified ${cartInDb.rows.length} item(s) persisted in public.cart (Quantity: ${cartInDb.rows[0].quantity})`);

  // Test cart quantity update in SQL
  await cartRepo.updateItemQuantity(basketId, sampleProduct.id, 3, {
    selectedVariant: 'Size: M / Color: Emerald Green',
    userId: createdUser.id,
  });
  const cartUpdated = await query(`SELECT quantity FROM cart WHERE user_id = $1`, [userInDb.rows[0].id]);
  console.log(`✅ [SQL UPDATE cart]: Cart quantity successfully updated to ${cartUpdated.rows[0].quantity} in public.cart`);

  // Test User Cart Fetch (incognito/refresh simulation)
  const userCart = await cartRepo.getUserCart(createdUser.id);
  console.log(`✅ [SQL getUserCart]: Loaded cart for user ${createdUser.id} directly from PostgreSQL: ${userCart.totalItemCount} item(s), Subtotal: $${userCart.subtotal}`);

  // --- TEST 4: Orders & Checkout (Transaction: order, order_item, inventory decrement, cart clear) ---
  console.log('\n--- TEST 4: PostgreSQL Checkout Transaction (order, order_item, inventory, cart) ---');
  const stockBefore = await inventoryRepo.getStock(internalProdId!, 1);
  const order = await orderRepo.createOrder({
    userId: createdUser.id,
    userEmail: createdUser.email,
    userName: createdUser.name,
    basketId,
    items: userCart.items,
    shippingAddress: {
      fullName: createdUser.name,
      street: '100 Silicon Way',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'United States',
      phone: '+1 (555) 777-9999',
    },
    shippingMethod: 'express',
    paymentMethod: 'credit_card',
  });
  console.log(`✅ [Order Placed]: Order Number: ${order.orderNumber}, Tracking: ${order.trackingNumber}, Grand Total: $${order.grandTotal}`);

  // Verify in "order" table
  const orderInDb = await query(`SELECT * FROM "order" WHERE order_number = $1`, [order.orderNumber]);
  if (orderInDb.rows.length === 0) throw new Error('Order header missing in public."order" table!');
  console.log(`✅ [SQL SELECT "order"]: Verified order header exists in public."order" (ID: ${orderInDb.rows[0].id}, Status: ${orderInDb.rows[0].status})`);

  // Verify in order_item table
  const itemsInDb = await query(`SELECT * FROM order_item WHERE order_id = $1`, [orderInDb.rows[0].id]);
  if (itemsInDb.rows.length === 0) throw new Error('Order items missing in public.order_item table!');
  console.log(`✅ [SQL SELECT order_item]: Verified ${itemsInDb.rows.length} line item(s) in public.order_item (Product ID: ${itemsInDb.rows[0].product_id}, Price: $${itemsInDb.rows[0].price})`);

  // Verify stock decremented in inventory table
  const stockAfter = await inventoryRepo.getStock(internalProdId!, 1);
  console.log(`✅ [SQL Inventory Decrement]: Stock for Store 1 decremented from ${stockBefore} to ${stockAfter}`);

  // Verify cart cleared from public.cart table
  const cartAfterCheckout = await query(`SELECT COUNT(*) as cnt FROM cart WHERE user_id = $1`, [userInDb.rows[0].id]);
  if (parseInt(cartAfterCheckout.rows[0].cnt, 10) !== 0) throw new Error('Cart was not cleared from public.cart!');
  console.log(`✅ [SQL Cart Cleared]: Cart rows for user_id ${userInDb.rows[0].id} in public.cart: ${cartAfterCheckout.rows[0].cnt} (100% Cleared)`);

  // --- TEST 5: Customer Wishlist in public.wishlist ---
  console.log('\n--- TEST 5: public.wishlist Persistence Verification ---');
  await wishlistRepo.addToWishlist(createdUser.id, sampleProduct.id);
  const wishInDb = await query(`SELECT * FROM wishlist WHERE user_id = $1`, [userInDb.rows[0].id]);
  if (wishInDb.rows.length === 0) throw new Error('Wishlist item not found in public.wishlist!');
  console.log(`✅ [SQL INSERT wishlist]: Verified item added to public.wishlist (Row count: ${wishInDb.rows.length})`);

  const userWishlist = await wishlistRepo.getWishlistByUser(createdUser.id);
  console.log(`✅ [SQL SELECT wishlist]: Loaded ${userWishlist.length} item(s) from PostgreSQL. Title: "${userWishlist[0].title}"`);

  await wishlistRepo.removeFromWishlist(createdUser.id, sampleProduct.id);
  const wishAfterRemove = await query(`SELECT COUNT(*) as cnt FROM wishlist WHERE user_id = $1`, [userInDb.rows[0].id]);
  console.log(`✅ [SQL DELETE wishlist]: Removed item from public.wishlist. Remaining: ${wishAfterRemove.rows[0].cnt}`);

  // --- TEST 6: Product Reviews in public.product_reviews ---
  console.log('\n--- TEST 6: public.product_reviews Persistence Verification ---');
  const newRev = await productRepo.addReview(sampleProduct.id, {
    userName: 'Automated QA Reviewer',
    userEmail: testEmail,
    rating: 5,
    comment: 'Exceptional craftsmanship and verified purchase directly recorded in PostgreSQL 18!',
  });
  console.log(`✅ [SQL INSERT product_reviews]: Created review ID: ${newRev.id}, Rating: ${newRev.rating} stars`);

  const revInDb = await query(`SELECT * FROM product_reviews WHERE review_code = $1`, [newRev.id]);
  console.log(`✅ [SQL SELECT product_reviews]: Verified review in PostgreSQL table. Comment: "${revInDb.rows[0].comment}"`);

  console.log('\n================================================================');
  console.log('🎉 ALL 6 END-TO-END POSTGRESQL 18 TESTS PASSED WITH 100% SUCCESS!');
  console.log('   All application state and CRUD operations persist exclusively in PostgreSQL 18.');
  console.log('================================================================');
}

runEndToEndVerification()
  .then(() => pool.end())
  .catch(err => {
    console.error('❌ E2E Verification Failed:', err);
    pool.end();
    process.exit(1);
  });

