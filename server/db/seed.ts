import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { INITIAL_PRODUCTS, INITIAL_USERS, SEED_PASSWORDS } from '../seedData.js';
import { getClient, pool, query, verifyConnection } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeed(): Promise<void> {
  console.log('[PostgreSQL 18 Seed] Starting database migration & seed process...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Execute schema DDL
  await query(schemaSql);
  console.log('[PostgreSQL 18 Seed] Schema tables and indexes created successfully.');

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Seed Stores
    console.log('[PostgreSQL 18 Seed] Seeding retail stores...');
    const storesData = [
      {
        name: 'ShopSphere Austin Flagship',
        address: '742 Evergreen Terrace, Austin, TX 78701',
        phone: '+1 (555) 482-9102',
      },
      {
        name: 'ShopSphere Silicon Valley Hub',
        address: '450 Tech Innovation Way, San Francisco, CA 94105',
        phone: '+1 (555) 019-2834',
      },
      {
        name: 'ShopSphere Chicago Center',
        address: '1280 Michigan Avenue, Chicago, IL 60611',
        phone: '+1 (555) 839-1120',
      },
    ];

    const storeIds: number[] = [];
    for (const s of storesData) {
      const res = await client.query(
        `INSERT INTO store (name, address, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET address = EXCLUDED.address, phone = EXCLUDED.phone
         RETURNING id`,
        [s.name, s.address, s.phone]
      );
      storeIds.push(res.rows[0].id);
    }

    // 2. Seed Pre-configured QA Users
    console.log('[PostgreSQL 18 Seed] Seeding QA users...');
    const userMap: Record<string, number> = {};

    for (const u of INITIAL_USERS) {
      const username = u.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      const res = await client.query(
        `INSERT INTO users (
           user_code, name, username, email, password, role, phone, avatar,
           address_line_1, address_city, address_state, address_postal_code, address_country, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
         RETURNING id`,
        [
          u.id,
          u.name,
          username,
          u.email.toLowerCase(),
          u.passwordHash,
          u.role,
          u.phone || null,
          u.avatar || null,
          u.address?.street || null,
          u.address?.city || null,
          u.address?.state || null,
          u.address?.postalCode || null,
          u.address?.country || null,
          u.createdAt || new Date().toISOString(),
        ]
      );
      userMap[u.id] = res.rows[0].id;
    }

    // 3. Seed Products
    console.log(`[PostgreSQL 18 Seed] Seeding ${INITIAL_PRODUCTS.length} catalog products...`);
    const productMap: Record<string, number> = {};

    for (const p of INITIAL_PRODUCTS) {
      const res = await client.query(
        `INSERT INTO product (
           product_code, name, slug, price, compare_at_price, category, subcategory,
           description, image_url, images, variants, rating, reviews_count, stock,
           tags, specifications, color_options, size_options, scent_notes, featured
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         ON CONFLICT (product_code) DO UPDATE SET
           name = EXCLUDED.name,
           price = EXCLUDED.price,
           category = EXCLUDED.category,
           stock = EXCLUDED.stock,
           image_url = EXCLUDED.image_url,
           images = EXCLUDED.images,
           variants = EXCLUDED.variants
         RETURNING id`,
        [
          p.id,
          p.title,
          p.slug,
          p.price,
          p.compareAtPrice || null,
          p.category,
          p.subcategory || 'General',
          p.description,
          p.images[0] || null,
          JSON.stringify(p.images || []),
          JSON.stringify(p.variants || []),
          p.rating || 4.5,
          p.reviewsCount || 0,
          p.stock || 10,
          JSON.stringify(p.tags || []),
          JSON.stringify(p.specifications || {}),
          JSON.stringify(p.colorOptions || []),
          JSON.stringify(p.sizeOptions || []),
          JSON.stringify(p.scentNotes || {}),
          p.featured || false,
        ]
      );
      const insertedProductId = res.rows[0].id;
      productMap[p.id] = insertedProductId;

      // 4. Seed Inventory for each store
      for (let i = 0; i < storeIds.length; i++) {
        const storeId = storeIds[i];
        // Distribute stock across stores
        const stockRatio = i === 0 ? 1 : i === 1 ? 0.8 : 1.2;
        const available = Math.max(1, Math.round((p.stock || 10) * stockRatio));
        await client.query(
          `INSERT INTO inventory (product_id, store_id, stock_available)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, store_id) DO UPDATE SET stock_available = EXCLUDED.stock_available`,
          [insertedProductId, storeId, available]
        );
      }
    }

    // 5. Seed Customer Reviews
    console.log('[PostgreSQL 18 Seed] Seeding customer reviews...');
    const seedReviews = [
      {
        reviewCode: 'rev_001',
        productCode: 'prod_fash_01',
        userName: 'Sophia M.',
        userEmail: 'sophia.m@example.com',
        rating: 5,
        comment: 'Absolutely stunning dress! The silk fabric drape is top notch and the emerald green color is even richer in person.',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        reviewCode: 'rev_002',
        productCode: 'prod_fash_01',
        userName: 'Elena R.',
        userEmail: 'elena.r@example.com',
        rating: 5,
        comment: 'Wore this to a gala dinner and received so many compliments. Fits true to size and feels very luxurious.',
        createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      },
      {
        reviewCode: 'rev_003',
        productCode: 'prod_elec_01',
        userName: 'David K.',
        userEmail: 'david.k@example.com',
        rating: 5,
        comment: 'The Snapdragon 8 Gen 3 performance is blistering fast. The 2K 120Hz display is the best I have ever used.',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        reviewCode: 'rev_004',
        productCode: 'prod_elec_01',
        userName: 'Marcus T.',
        userEmail: 'marcus.t@example.com',
        rating: 4,
        comment: 'Camera quality is phenomenal in low light. Battery lasts 1.5 days easily with heavy usage.',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        reviewCode: 'rev_005',
        productCode: 'prod_audio_01',
        userName: 'Liam P.',
        userEmail: 'liam.p@example.com',
        rating: 5,
        comment: 'Best ANC earbuds on the market. 48dB noise cancellation completely cuts out airplane and subway hum.',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        reviewCode: 'rev_006',
        productCode: 'prod_beauty_01',
        userName: 'Amira H.',
        userEmail: 'amira.h@example.com',
        rating: 5,
        comment: 'Smells like high-end Arabian luxury. The oud and amber blend projects beautifully for 10+ hours.',
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      },
    ];

    for (const r of seedReviews) {
      const pId = productMap[r.productCode];
      if (pId) {
        await client.query(
          `INSERT INTO product_reviews (review_code, product_id, user_name, user_email, rating, comment, verified_purchase, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, $7)
           ON CONFLICT (review_code) DO NOTHING`,
          [r.reviewCode, pId, r.userName, r.userEmail, r.rating, r.comment, r.createdAt]
        );
      }
    }

    // 6. Seed Sample Demonstration Order for Customer 1
    console.log('[PostgreSQL 18 Seed] Seeding initial customer order...');
    const sampleCustId = userMap['user_cust_001'];
    const sampleProdId = productMap['prod_fash_01'] || 1;
    const samplePrice = 189.99;
    const sampleTax = parseFloat((samplePrice * 0.0825).toFixed(2));
    const sampleGrandTotal = parseFloat((samplePrice + sampleTax).toFixed(2));

    const orderRes = await client.query(
      `INSERT INTO "order" (
         order_number, user_id, user_email, user_name, basket_id, tracking_id,
         status, total_amount, subtotal, tax, shipping_fee, shipping_method,
         payment_method, payment_status, address_line_1, address_postal_code,
         address_city, address_state, address_country, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (order_number) DO NOTHING
       RETURNING id`,
      [
        'ORD-782910-QA',
        sampleCustId,
        'customer@practicesoftwaretesting.com',
        'Jane Customer (User 1)',
        'basket_seed_demo',
        'TRK-USPS-8291047291',
        'delivered',
        sampleGrandTotal,
        samplePrice,
        sampleTax,
        0.00,
        'express',
        'credit_card',
        'paid',
        '742 Evergreen Terrace',
        '78701',
        'Austin',
        'TX',
        'United States',
        new Date(Date.now() - 86400000 * 3).toISOString(),
      ]
    );

    if (orderRes.rows.length > 0) {
      const insertedOrderId = orderRes.rows[0].id;
      await client.query(
        `INSERT INTO order_item (
           order_id, product_id, user_id, price, quantity, selected_variant, selected_color, selected_size, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          insertedOrderId,
          sampleProdId,
          sampleCustId,
          samplePrice,
          1,
          'Size: M / Color: Emerald Green',
          'Emerald Green',
          'M',
          new Date(Date.now() - 86400000 * 3).toISOString(),
        ]
      );
    }

    await client.query('COMMIT');
    console.log('[PostgreSQL 18 Seed] Database successfully seeded with 100% relational integrity!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL 18 Seed Error] Seed transaction rolled back:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Allow standalone execution: `npx tsx server/db/seed.ts`
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  (async () => {
    try {
      const ok = await verifyConnection();
      if (!ok) {
        process.exit(1);
      }
      await runSeed();
      console.log('Seed completed successfully.');
      await pool.end();
      process.exit(0);
    } catch (e) {
      console.error('Seed script failed:', e);
      process.exit(1);
    }
  })();
}

