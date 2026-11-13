import { Product, Review } from '../../src/types.js';
import { getClient, query } from '../db/pool.js';

export function mapProductRow(row: any): Product {
  const images = Array.isArray(row.images)
    ? row.images
    : typeof row.images === 'string'
    ? JSON.parse(row.images)
    : [row.image_url || ''];

  const variants = Array.isArray(row.variants)
    ? row.variants
    : typeof row.variants === 'string'
    ? JSON.parse(row.variants)
    : [];

  const tags = Array.isArray(row.tags)
    ? row.tags
    : typeof row.tags === 'string'
    ? JSON.parse(row.tags)
    : [];

  const specifications = typeof row.specifications === 'object' && row.specifications !== null
    ? row.specifications
    : typeof row.specifications === 'string'
    ? JSON.parse(row.specifications)
    : {};

  const colorOptions = Array.isArray(row.color_options)
    ? row.color_options
    : typeof row.color_options === 'string'
    ? JSON.parse(row.color_options)
    : undefined;

  const sizeOptions = Array.isArray(row.size_options)
    ? row.size_options
    : typeof row.size_options === 'string'
    ? JSON.parse(row.size_options)
    : undefined;

  const scentNotes = typeof row.scent_notes === 'object' && row.scent_notes !== null
    ? row.scent_notes
    : typeof row.scent_notes === 'string'
    ? JSON.parse(row.scent_notes)
    : undefined;

  return {
    id: row.product_code || String(row.id),
    title: row.name,
    slug: row.slug || String(row.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category: row.category,
    subcategory: row.subcategory || 'General',
    price: parseFloat(row.price),
    compareAtPrice: row.compare_at_price ? parseFloat(row.compare_at_price) : undefined,
    stock: parseInt(row.stock_available !== undefined ? row.stock_available : row.stock, 10),
    rating: parseFloat(row.rating || 4.5),
    reviewsCount: parseInt(row.reviews_count || 0, 10),
    images,
    description: row.description || '',
    tags,
    specifications,
    variants,
    colorOptions,
    sizeOptions,
    scentNotes,
    featured: Boolean(row.featured),
  };
}

export function mapReviewRow(row: any): Review {
  return {
    id: row.review_code || String(row.id),
    productId: row.product_code || String(row.product_id),
    userName: row.user_name,
    userEmail: row.user_email || undefined,
    rating: parseInt(row.rating, 10),
    comment: row.comment,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    verifiedPurchase: Boolean(row.verified_purchase),
  };
}

export class ProductRepository {
  async getProducts(params: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
    storeId?: number;
  }): Promise<{ products: Product[]; total: number; page: number; totalPages: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    // Join with inventory if storeId is supplied
    let fromClause = 'FROM product p';
    let selectClause = 'SELECT p.*';

    if (params.storeId) {
      fromClause += ` LEFT JOIN inventory inv ON p.id = inv.product_id AND inv.store_id = $${idx}`;
      selectClause += ', COALESCE(inv.stock_available, p.stock) AS stock_available';
      values.push(params.storeId);
      idx++;
    }

    if (params.category && params.category !== 'all') {
      conditions.push(`(LOWER(p.category) = LOWER($${idx}) OR LOWER(p.subcategory) = LOWER($${idx}))`);
      values.push(params.category);
      idx++;
    }

    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(p.name) LIKE $${idx} OR LOWER(p.description) LIKE $${idx} OR LOWER(p.subcategory) LIKE $${idx} OR p.tags::text ILIKE $${idx})`
      );
      values.push(q);
      idx++;
    }

    if (typeof params.minPrice === 'number' && !isNaN(params.minPrice)) {
      conditions.push(`p.price >= $${idx}`);
      values.push(params.minPrice);
      idx++;
    }

    if (typeof params.maxPrice === 'number' && !isNaN(params.maxPrice)) {
      conditions.push(`p.price <= $${idx}`);
      values.push(params.maxPrice);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*) AS total ${fromClause} ${whereClause}`;
    const countRes = await query(countSql, values);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    // Sorting
    let orderBy = 'ORDER BY p.featured DESC, p.id ASC';
    switch (params.sort) {
      case 'price_asc':
      case 'price-asc':
      case 'low-to-high':
        orderBy = 'ORDER BY p.price ASC';
        break;
      case 'price_desc':
      case 'price-desc':
      case 'high-to-low':
        orderBy = 'ORDER BY p.price DESC';
        break;
      case 'rating':
        orderBy = 'ORDER BY p.rating DESC';
        break;
      case 'newest':
        orderBy = 'ORDER BY p.created_at DESC';
        break;
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 12));
    const offset = (page - 1) * limit;

    const dataSql = `${selectClause} ${fromClause} ${whereClause} ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`;
    const dataRes = await query(dataSql, [...values, limit, offset]);

    return {
      products: dataRes.rows.map(mapProductRow),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getProductById(id: string | number): Promise<Product | null> {
    const isNum = !isNaN(Number(id));
    const res = await query(
      `SELECT * FROM product WHERE (product_code = $1 ${isNum ? 'OR id = $2' : ''}) LIMIT 1`,
      isNum ? [String(id), Number(id)] : [String(id)]
    );
    if (res.rows.length === 0) return null;
    return mapProductRow(res.rows[0]);
  }

  async getInternalProductId(id: string | number): Promise<number | null> {
    const isNum = !isNaN(Number(id));
    const res = await query(
      `SELECT id FROM product WHERE (product_code = $1 ${isNum ? 'OR id = $2' : ''}) LIMIT 1`,
      isNum ? [String(id), Number(id)] : [String(id)]
    );
    return res.rows[0]?.id || null;
  }

  async createProduct(p: Partial<Product>): Promise<Product> {
    const code = p.id || `prod_${Date.now().toString(36)}`;
    const slug = p.slug || (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const images = p.images?.length ? p.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO product (
           product_code, name, slug, price, compare_at_price, category, subcategory,
           description, image_url, images, variants, rating, reviews_count, stock,
           tags, specifications, featured
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          code,
          p.title || 'Untitled Product',
          slug,
          p.price || 0,
          p.compareAtPrice || null,
          p.category || 'fashion',
          p.subcategory || 'General',
          p.description || '',
          images[0],
          JSON.stringify(images),
          JSON.stringify(p.variants || []),
          p.rating || 4.5,
          p.reviewsCount || 0,
          p.stock || 10,
          JSON.stringify(p.tags || []),
          JSON.stringify(p.specifications || {}),
          Boolean(p.featured),
        ]
      );

      const inserted = res.rows[0];

      // Auto-populate inventory for all stores
      const stores = await client.query(`SELECT id FROM store`);
      for (const st of stores.rows) {
        await client.query(
          `INSERT INTO inventory (product_id, store_id, stock_available)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, store_id) DO NOTHING`,
          [inserted.id, st.id, p.stock || 10]
        );
      }

      await client.query('COMMIT');
      return mapProductRow(inserted);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateProduct(id: string | number, updates: Partial<Product>): Promise<Product | null> {
    const existingId = await this.getInternalProductId(id);
    if (!existingId) return null;

    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.title !== undefined) {
      sets.push(`name = $${idx++}`);
      values.push(updates.title);
    }
    if (updates.price !== undefined) {
      sets.push(`price = $${idx++}`);
      values.push(updates.price);
    }
    if (updates.compareAtPrice !== undefined) {
      sets.push(`compare_at_price = $${idx++}`);
      values.push(updates.compareAtPrice);
    }
    if (updates.category !== undefined) {
      sets.push(`category = $${idx++}`);
      values.push(updates.category);
    }
    if (updates.subcategory !== undefined) {
      sets.push(`subcategory = $${idx++}`);
      values.push(updates.subcategory);
    }
    if (updates.description !== undefined) {
      sets.push(`description = $${idx++}`);
      values.push(updates.description);
    }
    if (updates.stock !== undefined) {
      sets.push(`stock = $${idx++}`);
      values.push(updates.stock);
    }
    if (updates.images !== undefined) {
      sets.push(`images = $${idx++}`);
      values.push(JSON.stringify(updates.images));
      sets.push(`image_url = $${idx++}`);
      values.push(updates.images[0] || null);
    }
    if (updates.tags !== undefined) {
      sets.push(`tags = $${idx++}`);
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.specifications !== undefined) {
      sets.push(`specifications = $${idx++}`);
      values.push(JSON.stringify(updates.specifications));
    }
    if (updates.featured !== undefined) {
      sets.push(`featured = $${idx++}`);
      values.push(Boolean(updates.featured));
    }

    if (sets.length === 0) {
      return this.getProductById(id);
    }

    values.push(existingId);
    const sql = `UPDATE product SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query(sql, values);
    return mapProductRow(res.rows[0]);
  }

  async deleteProduct(id: string | number): Promise<boolean> {
    const existingId = await this.getInternalProductId(id);
    if (!existingId) return false;

    const res = await query(`DELETE FROM product WHERE id = $1 RETURNING id`, [existingId]);
    return res.rowCount !== null && res.rowCount > 0;
  }

  async getReviewsForProduct(id: string | number): Promise<Review[]> {
    const internalId = await this.getInternalProductId(id);
    if (!internalId) return [];

    const res = await query(
      `SELECT pr.*, p.product_code
       FROM product_reviews pr
       JOIN product p ON pr.product_id = p.id
       WHERE pr.product_id = $1
       ORDER BY pr.created_at DESC`,
      [internalId]
    );
    return res.rows.map(mapReviewRow);
  }

  async addReview(
    productId: string | number,
    review: { userName: string; userEmail?: string; rating: number; comment: string }
  ): Promise<Review> {
    const internalId = await this.getInternalProductId(productId);
    if (!internalId) {
      throw new Error(`Product not found: ${productId}`);
    }

    const reviewCode = `rev_${Date.now().toString(36)}`;
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `INSERT INTO product_reviews (review_code, product_id, user_name, user_email, rating, comment, verified_purchase)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [reviewCode, internalId, review.userName, review.userEmail || null, review.rating, review.comment]
      );

      // Recalculate average rating and count
      const agg = await client.query(
        `SELECT COUNT(*) as cnt, AVG(rating) as avg_rating FROM product_reviews WHERE product_id = $1`,
        [internalId]
      );
      const count = parseInt(agg.rows[0].cnt, 10);
      const avg = parseFloat(parseFloat(agg.rows[0].avg_rating || '5').toFixed(1));

      await client.query(
        `UPDATE product SET rating = $1, reviews_count = $2 WHERE id = $3`,
        [avg, count, internalId]
      );

      await client.query('COMMIT');

      const product = await this.getProductById(internalId);
      return {
        id: reviewCode,
        productId: product ? product.id : String(internalId),
        userName: review.userName,
        userEmail: review.userEmail,
        rating: review.rating,
        comment: review.comment,
        createdAt: new Date().toISOString(),
        verifiedPurchase: true,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const productRepo = new ProductRepository();

