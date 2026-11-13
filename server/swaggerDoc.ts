export const DOT_WORKFLOW_DEFINITION = `
digraph ShopSphere_E2E_ECommerce_Flow {
  graph [rankdir=TB, bgcolor="transparent", fontname="Plus Jakarta Sans", nodesep=0.6, ranksep=0.8];
  node [shape=box, style="filled,rounded", fontname="Plus Jakarta Sans", fontsize=11, margin="0.25,0.15"];
  edge [fontname="JetBrains Mono", fontsize=9, color="#94a3b8", arrowsize=0.8];

  // --- Subgraph: User Authentication ---
  subgraph cluster_auth {
    label = "1. Authentication & RBAC Layer (PostgreSQL users table)";
    style = "filled,rounded";
    color = "#e2e8f0";
    fillcolor = "#f8fafc";
    fontname = "Plus Jakarta Sans";
    fontsize = 13;

    Start [label="START\\nQA Test Session", shape=ellipse, fillcolor="#3b82f6", fontcolor="#ffffff"];
    Register [label="POST /api/users/register\\nCreate Customer Profile in PostgreSQL\\n(Status: 201)", fillcolor="#eff6ff", color="#3b82f6"];
    Login [label="POST /api/users/login\\nAuth Credentials\\n(Status: 200 -> 24h JWT Bearer)", fillcolor="#eff6ff", color="#3b82f6"];
    OAuth [label="POST /api/users/oauth\\nGoogle / Apple OAuth\\n(Status: 200 -> 24h JWT Bearer)", fillcolor="#eff6ff", color="#3b82f6"];
    GetMe [label="GET /api/users/me\\nAuthorize Session & Verify Role\\n(Customer / Admin)", fillcolor="#eff6ff", color="#3b82f6"];
  }

  // --- Subgraph: Multi-Category Catalog & Inventory ---
  subgraph cluster_catalog {
    label = "2. Catalog Browsing & Multi-Store Inventory (product, store, inventory tables)";
    style = "filled,rounded";
    color = "#e2e8f0";
    fillcolor = "#f8fafc";
    fontname = "Plus Jakarta Sans";
    fontsize = 13;

    BrowseCatalog [label="GET /api/products\\nBrowse Multi-Category Storefront", fillcolor="#f0fdf4", color="#22c55e"];
    FilterCategory [label="GET /api/products?category={cat}&page=1\\n(Dresses, Mobiles, Audio, Perfumes)", fillcolor="#f0fdf4", color="#22c55e"];
    StoreStock [label="GET /api/stores & /api/inventory/:productId\\nMulti-Store Physical Availability", fillcolor="#f0fdf4", color="#22c55e"];
    SearchFilter [label="Filter Price Range & Sort\\n(Low to High, High to Low, Rating)", fillcolor="#f0fdf4", color="#22c55e"];
    ViewPDP [label="GET /api/products/:id\\nInspect PDP (Specs, Sizing, Colors, Notes)", fillcolor="#f0fdf4", color="#22c55e"];
  }

  // --- Subgraph: Cart & Basket Management ---
  subgraph cluster_cart {
    label = "3. Basket & Cart Management (cart table in PostgreSQL)";
    style = "filled,rounded";
    color = "#e2e8f0";
    fillcolor = "#f8fafc";
    fontname = "Plus Jakarta Sans";
    fontsize = 13;

    InitBasket [label="POST /api/carts\\nInit Unique Basket Session\\n(Status: 201 -> basketId)", fillcolor="#fefce8", color="#eab308"];
    AddItem [label="POST /api/carts/:basketId\\nAdd/Update Product Variant & Qty\\n(Status: 200: 'item added or updated')", fillcolor="#fefce8", color="#eab308"];
    GetBasket [label="GET /api/carts/:basketId\\nRetrieve Basket & Total Item Count\\n(Subtotal, Tax, Shipping)", fillcolor="#fefce8", color="#eab308"];
    DeleteBasketItem [label="DELETE /api/carts/:basketId\\nRemove Item / Clear Cart\\n(Status: 204 No Content)", fillcolor="#fefce8", color="#eab308"];
  }

  // --- Subgraph: Multi-Step Checkout & Payment ---
  subgraph cluster_checkout {
    label = "4. Checkout & Payment Gateway (order & order_item tables with SQL transactions)";
    style = "filled,rounded";
    color = "#e2e8f0";
    fillcolor = "#f8fafc";
    fontname = "Plus Jakarta Sans";
    fontsize = 13;

    ShippingStep [label="1. Address Selection & Form Validation\\n(Street, City, Zip, Phone)", fillcolor="#faf5ff", color="#a855f7"];
    ShippingMethod [label="2. Delivery Method Selection\\n(Standard $0 / Express $14.99)", fillcolor="#faf5ff", color="#a855f7"];
    PaymentStep [label="3. Payment Method Selection\\n(UPI, Credit/Debit Card, Net Banking, COD)", fillcolor="#faf5ff", color="#a855f7"];
    OTPStep [label="4. OTP Verification Gate\\n(Simulated OTP: 123456)", fillcolor="#faf5ff", color="#a855f7"];
    PlaceOrder [label="POST /api/orders\\nPlace Order (SQL BEGIN/COMMIT, Stock Decrement)\\n(Status: 201 -> Order ID, Tracking #)", fillcolor="#faf5ff", color="#a855f7"];
  }

  // --- Subgraph: Post Purchase & Admin ---
  subgraph cluster_post_purchase {
    label = "5. Post-Purchase & QA Controls";
    style = "filled,rounded";
    color = "#e2e8f0";
    fillcolor = "#f8fafc";
    fontname = "Plus Jakarta Sans";
    fontsize = 13;

    ViewOrders [label="GET /api/orders\\nFetch Order History & Tracking from PostgreSQL", fillcolor="#ecfdf5", color="#10b981"];
    AdminPanel [label="Admin Inventory & Orders Dashboard\\n(Sampath Kumar - admin@practicesoftwaretesting.com)", fillcolor="#fff1f2", color="#f43f5e"];
    ResetDB [label="POST /api/seed/reset\\nRe-run PostgreSQL 18 Migration & Seed DDL\\n(Pristine QA Test Run)", fillcolor="#f1f5f9", color="#64748b"];
  }

  // Flow Connections
  Start -> Register [label="New User"];
  Start -> Login [label="Existing Account"];
  Start -> OAuth [label="Google / Apple"];
  Register -> Login [label="Redirect"];
  Login -> GetMe [label="Bearer JWT"];
  OAuth -> GetMe [label="Bearer JWT"];
  GetMe -> BrowseCatalog;

  BrowseCatalog -> FilterCategory;
  FilterCategory -> StoreStock;
  StoreStock -> SearchFilter;
  SearchFilter -> ViewPDP;

  ViewPDP -> InitBasket [label="Select Variant"];
  InitBasket -> AddItem [label="basketId"];
  AddItem -> GetBasket [label="Inspect Totals"];
  GetBasket -> DeleteBasketItem [label="Optional Edit"];
  DeleteBasketItem -> GetBasket;

  GetBasket -> ShippingStep [label="Proceed to Checkout"];
  ShippingStep -> ShippingMethod;
  ShippingMethod -> PaymentStep;
  PaymentStep -> OTPStep [label="Gateway Verify"];
  OTPStep -> PlaceOrder [label="OTP Accepted"];

  PlaceOrder -> ViewOrders [label="Order Confirmed"];
  PlaceOrder -> AdminPanel [label="Admin View"];
  AdminPanel -> ResetDB [label="QA Teardown"];
}
`;

export const SWAGGER_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'ShopSphere PostgreSQL 18 Multi-Category E-Commerce & QA API',
    version: '2.0.0',
    description: `Production-ready REST API for ShopSphere, fully backed by local PostgreSQL 18 ('DataBase_for_SamEcommers'). Features relational 7-table schema, atomic SQL transactions, multi-store inventory management, 24-hour JWT authentication, and automated QA database seed resets.`,
    contact: {
      name: 'QA Automation & Database Architecture Team',
      email: 'admin@practicesoftwaretesting.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Local PostgreSQL 18 Express Backend API',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your 24-hour JWT token obtained from /api/users/login or /api/users/oauth',
      },
    },
    schemas: {
      UserRegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Jane Customer' },
          email: { type: 'string', format: 'email', example: 'customer@practicesoftwaretesting.com' },
          password: { type: 'string', example: 'User01' },
          phone: { type: 'string', example: '+1 (555) 482-9102' },
          role: { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
        },
      },
      UserLoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@practicesoftwaretesting.com' },
          password: { type: 'string', example: 'welcome01' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'prod_fash_01' },
          title: { type: 'string', example: 'Silk Evening Flared Wrap Dress' },
          slug: { type: 'string', example: 'silk-evening-flared-wrap-dress' },
          category: { type: 'string', enum: ['fashion', 'electronics', 'audio', 'beauty'] },
          subcategory: { type: 'string', example: 'Dresses' },
          price: { type: 'number', example: 189.99 },
          stock: { type: 'integer', example: 24 },
          rating: { type: 'number', example: 4.8 },
          reviewsCount: { type: 'integer', example: 12 },
          images: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          specifications: { type: 'object' },
        },
      },
      Store: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'ShopSphere Austin Flagship' },
          address: { type: 'string', example: '742 Evergreen Terrace, Austin, TX 78701' },
          phone: { type: 'string', example: '+1 (555) 482-9102' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      InventoryItem: {
        type: 'object',
        properties: {
          productId: { type: 'integer', example: 1 },
          productCode: { type: 'string', example: 'prod_fash_01' },
          storeId: { type: 'integer', example: 1 },
          storeName: { type: 'string', example: 'ShopSphere Austin Flagship' },
          stockAvailable: { type: 'integer', example: 24 },
        },
      },
      BasketItemRequest: {
        type: 'object',
        required: ['productId'],
        properties: {
          productId: { type: 'string', example: 'prod_elec_01' },
          quantity: { type: 'integer', example: 1 },
          selectedVariant: { type: 'string', example: '256GB / Natural Titanium' },
          selectedColor: { type: 'string', example: 'Natural Titanium' },
          selectedSize: { type: 'string', example: 'M' },
          storeId: { type: 'integer', example: 1, description: 'Optional physical retail store ID' },
        },
      },
      OrderCreateRequest: {
        type: 'object',
        required: ['basketId', 'shippingAddress', 'shippingMethod', 'paymentMethod'],
        properties: {
          basketId: { type: 'string', example: 'basket_3a8f901b' },
          shippingAddress: {
            type: 'object',
            required: ['fullName', 'street', 'city', 'state', 'postalCode', 'country'],
            properties: {
              fullName: { type: 'string', example: 'Sampath Kumar' },
              street: { type: 'string', example: '450 Tech Innovation Way' },
              city: { type: 'string', example: 'San Francisco' },
              state: { type: 'string', example: 'CA' },
              postalCode: { type: 'string', example: '94105' },
              country: { type: 'string', example: 'United States' },
              phone: { type: 'string', example: '+1 (555) 019-2834' },
            },
          },
          shippingMethod: { type: 'string', enum: ['standard', 'express', 'priority'], example: 'express' },
          paymentMethod: { type: 'string', enum: ['upi', 'credit_card', 'net_banking', 'cod'], example: 'credit_card' },
          otpCode: { type: 'string', example: '123456' },
        },
      },
    },
  },
  paths: {
    '/users/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new customer account in PostgreSQL',
        description: 'Creates new user record in PostgreSQL users table and returns status 201 with 24-hour JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserRegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully in PostgreSQL',
          },
          '400': {
            description: 'Validation failed or email already registered',
          },
        },
      },
    },
    '/users/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user with email and password (24h JWT Bearer Token)',
        description: 'Authenticates user credentials against PostgreSQL, returns a 24-hour JWT Bearer token and user profile.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserLoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful. Returns 24h JWT token and user object.',
          },
          '401': {
            description: 'Invalid email or password',
          },
        },
      },
    },
    '/users/oauth': {
      post: {
        tags: ['Authentication'],
        summary: 'OAuth 2.0 Login / Registration (Google or Apple)',
        description: 'Authenticates or provisions a customer via Google or Apple OAuth in PostgreSQL and returns a 24-hour JWT Bearer token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['provider'],
                properties: {
                  provider: {
                    type: 'string',
                    enum: ['google', 'apple'],
                    example: 'google',
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'google.user@practicesoftwaretesting.com',
                  },
                  name: {
                    type: 'string',
                    example: 'Google Customer',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OAuth authentication successful. Returns 24-hour JWT Bearer token.',
          },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get authenticated user profile from PostgreSQL',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved successfully',
          },
          '401': {
            description: 'Unauthorized. Bearer token missing or invalid.',
          },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Catalog & Products'],
        summary: 'Filter and paginate products catalog from PostgreSQL',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category (fashion, electronics, audio, beauty) or subcategory (mobiles, dresses)' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Text search keyword' },
          { name: 'minPrice', in: 'query', schema: { type: 'number' }, description: 'Minimum price filter' },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' }, description: 'Maximum price filter' },
          { name: 'storeId', in: 'query', schema: { type: 'integer' }, description: 'Physical Store ID for location-specific stock availability' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'low-to-high', 'high-to-low', 'rating'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
        ],
        responses: {
          '200': {
            description: 'Filtered products list with pagination metadata',
          },
        },
      },
      post: {
        tags: ['Catalog & Products'],
        summary: 'Create a new product in PostgreSQL (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Product' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Product created and inventory seeded for all stores',
          },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Catalog & Products'],
        summary: 'Get single product detailed view (PDP)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'prod_fash_01' },
        ],
        responses: {
          '200': {
            description: 'Product detailed view returned',
          },
          '404': {
            description: 'Product not found in PostgreSQL',
          },
        },
      },
      put: {
        tags: ['Catalog & Products'],
        summary: 'Update product in PostgreSQL (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Product updated successfully' },
        },
      },
      delete: {
        tags: ['Catalog & Products'],
        summary: 'Delete product in PostgreSQL (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '204': { description: 'Product deleted successfully' },
        },
      },
    },
    '/products/{id}/reviews': {
      get: {
        tags: ['Catalog & Products'],
        summary: 'Get customer reviews for product from PostgreSQL product_reviews table',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'prod_fash_01' } },
        ],
        responses: {
          '200': {
            description: 'List of verified customer reviews',
          },
        },
      },
      post: {
        tags: ['Catalog & Products'],
        summary: 'Submit a new customer review (persists to PostgreSQL and updates product average rating)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'prod_fash_01' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userName', 'rating', 'comment'],
                properties: {
                  userName: { type: 'string', example: 'Sarah Jenkins' },
                  rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                  comment: { type: 'string', example: 'Superb quality and prompt shipping!' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Review saved to PostgreSQL and rating recalculated',
          },
        },
      },
    },
    '/stores': {
      get: {
        tags: ['Stores & Multi-Store Inventory'],
        summary: 'List all physical retail stores from PostgreSQL store table',
        responses: {
          '200': {
            description: 'List of physical retail stores with addresses and contacts',
          },
        },
      },
    },
    '/inventory/{productId}': {
      get: {
        tags: ['Stores & Multi-Store Inventory'],
        summary: 'Get inventory breakdown across all retail stores for a product',
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', example: 'prod_fash_01' } },
        ],
        responses: {
          '200': {
            description: 'Store-by-store stock availability breakdown',
          },
        },
      },
    },
    '/carts': {
      post: {
        tags: ['Cart & Basket'],
        summary: 'Initialize a unique basket object',
        responses: {
          '201': {
            description: 'Basket initialized successfully with unique basketId',
          },
        },
      },
    },
    '/carts/{basketId}': {
      get: {
        tags: ['Cart & Basket'],
        summary: 'Get products in basket and total item count from PostgreSQL cart table',
        parameters: [
          { name: 'basketId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Basket contents, item count, and financial totals returned',
          },
        },
      },
      post: {
        tags: ['Cart & Basket'],
        summary: 'Add or update product items in basket in PostgreSQL',
        parameters: [
          { name: 'basketId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BasketItemRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Returns item added or updated message with updated basket from PostgreSQL',
          },
        },
      },
      delete: {
        tags: ['Cart & Basket'],
        summary: 'Clear basket or remove item from PostgreSQL',
        parameters: [
          { name: 'basketId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'productId', in: 'query', schema: { type: 'string' } },
          { name: 'variant', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '204': {
            description: 'Basket or item cleared successfully (No Content)',
          },
        },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders & Checkout'],
        summary: 'Create and place order with atomic PostgreSQL transaction (decrements inventory)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order placed in PostgreSQL "order" & "order_item" tables. Stock decremented.',
          },
        },
      },
      get: {
        tags: ['Orders & Checkout'],
        summary: 'Get order history from PostgreSQL',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of past orders',
          },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders & Checkout'],
        summary: 'Get single order details by ID or Order Number from PostgreSQL',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'ORD-782910-QA' } },
        ],
        responses: {
          '200': {
            description: 'Detailed order with item breakdown and tracking ID',
          },
        },
      },
    },
    '/seed/reset': {
      post: {
        tags: ['QA & Test Utilities'],
        summary: 'Reset PostgreSQL database to pristine seed accounts and catalog',
        description: 'Executes DDL schema and re-populates PostgreSQL 18 tables (users, product, store, inventory, cart, order, order_item, product_reviews) for repeatable QA test runs.',
        responses: {
          '200': {
            description: 'PostgreSQL database successfully reset and re-seeded',
          },
        },
      },
    },
  },
};
