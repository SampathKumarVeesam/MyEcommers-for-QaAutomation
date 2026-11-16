export const DOT_WORKFLOW_DEFINITION = `
digraph ShopSphere_E2E_ECommerce_Flow {
  graph [rankdir=TB, bgcolor="transparent", fontname="Plus Jakarta Sans", nodesep=0.6, ranksep=0.8];
  node [shape=box, style="filled,rounded", fontname="Plus Jakarta Sans", fontsize=11, margin="0.25,0.15"];
  edge [fontname="JetBrains Mono", fontsize=9, color="#94a3b8", arrowsize=0.8];

  // --- Subgraph: User Authentication & OIDC ---
  subgraph cluster_auth {
    label = "1. Authentication, OIDC & RBAC Layer (PostgreSQL users table)";
    style = "filled,rounded";
    color = "#e2e8f0";
    fillcolor = "#f8fafc";
    fontname = "Plus Jakarta Sans";
    fontsize = 13;

    Start [label="START\\nQA Test Session", shape=ellipse, fillcolor="#3b82f6", fontcolor="#ffffff"];
    Register [label="POST /api/users/register\\nCustomer Registration\\n(Status: 201 -> Zoho Welcome Email)", fillcolor="#eff6ff", color="#3b82f6"];
    Login [label="POST /api/users/login\\nAuth Credentials\\n(Status: 200 -> 24h JWT Bearer\\n403: Customer Denied in Admin Portal)", fillcolor="#eff6ff", color="#3b82f6"];
    OAuthProviders [label="GET /api/users/oauth/providers\\nCheck Google & Apple Status", fillcolor="#eff6ff", color="#3b82f6"];
    OAuthFlow [label="GET /api/users/oauth/login/{provider}\\n3-Legged OIDC Auth Code Flow\\n(PKCE + State Verification)", fillcolor="#eff6ff", color="#3b82f6"];
    OAuthCallback [label="GET/POST /api/users/oauth/callback/{provider}\\nJWKS Signature Verification & Auto-Registration\\n(Status: 200 -> Zoho Welcome Email)", fillcolor="#eff6ff", color="#3b82f6"];
    GetMe [label="GET /api/users/me\\nVerify Authenticated Session & Role\\n(Customer / Administrator)", fillcolor="#eff6ff", color="#3b82f6"];
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
    ProductReviews [label="GET & POST /api/products/:id/reviews\\nCustomer Reviews & Rating Aggregation", fillcolor="#f0fdf4", color="#22c55e"];
  }

  // --- Subgraph: Cart & Basket Management ---
  subgraph cluster_cart {
    label = "3. Basket & Cart Management (cart & wishlist tables in PostgreSQL)";
    style = "filled,rounded";
    color = "#e2e8f0";
    fillcolor = "#f8fafc";
    fontname = "Plus Jakarta Sans";
    fontsize = 13;

    InitBasket [label="POST /api/carts\\nInit Unique Basket Session\\n(Status: 201 -> basketId)", fillcolor="#fefce8", color="#eab308"];
    AddItem [label="POST /api/carts/:basketId\\nAdd/Update Product Variant & Qty\\n(Status: 200: 'item added or updated')", fillcolor="#fefce8", color="#eab308"];
    GetBasket [label="GET /api/carts/:basketId\\nRetrieve Basket & Total Item Count\\n(Subtotal, Tax, Shipping)", fillcolor="#fefce8", color="#eab308"];
    DeleteBasketItem [label="DELETE /api/carts/:basketId\\nRemove Item / Clear Cart\\n(Status: 204 No Content)", fillcolor="#fefce8", color="#eab308"];
    WishlistOps [label="GET/POST/DELETE /api/wishlist\\nCustomer Wishlist Management", fillcolor="#fefce8", color="#eab308"];
  }

  // --- Subgraph: Multi-Step Checkout & Payment ---
  subgraph cluster_checkout {
    label = "4. Checkout & Payment Gateway (order & order_item tables with SQL transactions)";
    style = "filled,rounded";
    color = "#e2e8f0";
    fillcolor = "#f8fafc";
    fontname = "Plus Jakarta Sans";
    fontsize = 13;

    AuthGate [label="Checkout Auth Gate\\nCheck Authenticated State\\n(Prompt Login if Guest)", fillcolor="#faf5ff", color="#a855f7"];
    ShippingStep [label="1. Address Selection & Form Validation\\n(Street, City, Zip, Phone)", fillcolor="#faf5ff", color="#a855f7"];
    ShippingMethod [label="2. Delivery Method Selection\\n(Standard $0 / Express $14.99)", fillcolor="#faf5ff", color="#a855f7"];
    PaymentStep [label="3. Payment Method Selection\\n(UPI, Credit/Debit Card, Net Banking, COD)", fillcolor="#faf5ff", color="#a855f7"];
    OTPStep [label="4. OTP Verification Gate\\nPOST /api/orders/verify-otp (6-Digit Code)", fillcolor="#faf5ff", color="#a855f7"];
    PlaceOrder [label="POST /api/orders\\nPlace Order (SQL BEGIN/COMMIT, Stock Decrement)\\n(Status: 201 -> Zoho Confirmation Email)", fillcolor="#faf5ff", color="#a855f7"];
  }

  // --- Subgraph: Post Purchase, Admin & Zoho Notifications ---
  subgraph cluster_post_purchase {
    label = "5. Post-Purchase, Admin Analytics & Zoho Notifications";
    style = "filled,rounded";
    color = "#e2e8f0";
    fillcolor = "#f8fafc";
    fontname = "Plus Jakarta Sans";
    fontsize = 13;

    ViewOrders [label="GET /api/orders\\nFetch Order History & Tracking from PostgreSQL", fillcolor="#ecfdf5", color="#10b981"];
    OrderStatus [label="PUT /api/orders/:id/status\\nUpdate Order Status (Processing, Shipped, Delivered)\\n(Status: 200 -> Zoho Status Update Email)", fillcolor="#ecfdf5", color="#10b981"];
    AdminAnalytics [label="GET /api/admin/analytics/summary & /customers\\nPostgreSQL Sales, Inventory & Customer Analytics", fillcolor="#fff1f2", color="#f43f5e"];
    ResetDB [label="POST /api/seed/reset\\nRe-run PostgreSQL 18 Migration & Seed DDL\\n(Pristine QA Test Run)", fillcolor="#f1f5f9", color="#64748b"];
  }

  // Flow Connections
  Start -> Register [label="New User"];
  Start -> Login [label="Existing Account"];
  Start -> OAuthProviders [label="Check OAuth"];
  OAuthProviders -> OAuthFlow [label="Click Google/Apple"];
  OAuthFlow -> OAuthCallback [label="Consent Callback"];
  OAuthCallback -> GetMe [label="Bearer JWT"];
  Register -> Login [label="Redirect"];
  Login -> GetMe [label="Bearer JWT"];
  GetMe -> BrowseCatalog;

  BrowseCatalog -> FilterCategory;
  FilterCategory -> StoreStock;
  StoreStock -> SearchFilter;
  SearchFilter -> ViewPDP;
  ViewPDP -> ProductReviews;

  ViewPDP -> InitBasket [label="Select Variant"];
  InitBasket -> AddItem [label="basketId"];
  AddItem -> GetBasket [label="Inspect Totals"];
  AddItem -> WishlistOps [label="Save for Later"];
  GetBasket -> DeleteBasketItem [label="Optional Edit"];
  DeleteBasketItem -> GetBasket;

  GetBasket -> AuthGate [label="Proceed to Checkout"];
  AuthGate -> Login [label="If Guest (Prompt Sign In)"];
  Login -> ShippingStep [label="Resume Checkout"];
  AuthGate -> ShippingStep [label="If Authenticated"];

  ShippingStep -> ShippingMethod;
  ShippingMethod -> PaymentStep;
  PaymentStep -> OTPStep [label="Gateway Verify"];
  OTPStep -> PlaceOrder [label="OTP Accepted"];

  PlaceOrder -> ViewOrders [label="Order Confirmed"];
  PlaceOrder -> OrderStatus [label="Admin Fulfillment"];
  OrderStatus -> AdminAnalytics [label="KPI Aggregation"];
  AdminAnalytics -> ResetDB [label="QA Teardown"];
}
`;

export const SWAGGER_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'ShopSphere PostgreSQL 18 Multi-Category E-Commerce & QA API',
    version: '2.4.0',
    description: `Production-ready REST API for ShopSphere, fully backed by PostgreSQL 18 ('DataBase_for_SamEcommers'). Features relational 7-table schema, atomic SQL transactions, multi-store physical inventory, 3-legged OAuth 2.0 / OIDC flow (Google & Apple), 2FA Gateway OTP verification, Zoho SMTP email notifications, strict Admin RBAC, and automated QA database seed resets.`,
    contact: {
      name: 'QA Automation & Database Architecture Team',
      email: 'admin@practicesoftwaretesting.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Local & Production PostgreSQL 18 Express Backend API',
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
        required: ['password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@practicesoftwaretesting.com' },
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'Sampath@123' },
          portal: { type: 'string', enum: ['customer', 'admin'], example: 'admin' },
          requiredRole: { type: 'string', enum: ['customer', 'admin'], example: 'admin' },
        },
      },
      OAuthProviderConfig: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          providers: {
            type: 'object',
            properties: {
              google: { type: 'boolean', example: true },
              apple: { type: 'boolean', example: false },
            },
          },
        },
      },
      OAuthInitRequest: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: { type: 'string', enum: ['google', 'apple'], example: 'google' },
          redirectUri: { type: 'string', example: 'https://samecommers.netlify.app' },
        },
      },
      UserProfileUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Jane Customer Updated' },
          phone: { type: 'string', example: '+1 (555) 999-8888' },
          avatar: { type: 'string', example: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string', example: '123 New Address St' },
              city: { type: 'string', example: 'Austin' },
              state: { type: 'string', example: 'TX' },
              postalCode: { type: 'string', example: '78701' },
              country: { type: 'string', example: 'United States' },
            },
          },
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
      VerifyOtpRequest: {
        type: 'object',
        required: ['otpCode'],
        properties: {
          otpCode: { type: 'string', example: '123456', description: '6-digit verification code' },
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
      OrderStatusUpdateRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            example: 'shipped',
          },
        },
      },
    },
  },
  paths: {
    '/users/register': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Register a new customer account in PostgreSQL',
        description: 'Creates new user record in PostgreSQL users table, issues a 24-hour JWT token, and dispatches a Welcome Email via Zoho SMTP in the background.',
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
            description: 'User created successfully in PostgreSQL. Welcome email dispatched.',
          },
          '400': {
            description: 'Validation failed or email already registered',
          },
        },
      },
    },
    '/users/login': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Authenticate user with email/username and password (24h JWT Bearer Token)',
        description: 'Authenticates credentials against PostgreSQL public.users. Enforces strict role isolation: returns 403 Forbidden if standard customer credentials attempt access via portal="admin".',
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
            description: 'Authentication successful. Returns 24h JWT token and user profile object.',
          },
          '400': {
            description: 'Missing identifier or password',
          },
          '401': {
            description: 'Invalid email/username or password',
          },
          '403': {
            description: 'Access denied: Customer credentials cannot access the Administrator portal.',
          },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Authentication & Users'],
        summary: 'Get authenticated user session profile from PostgreSQL',
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
    '/users/profile': {
      put: {
        tags: ['Authentication & Users'],
        summary: 'Update authenticated customer profile in PostgreSQL public.users',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserProfileUpdateRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Profile updated in PostgreSQL' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/users/oauth/providers': {
      get: {
        tags: ['OAuth 2.0 & OIDC'],
        summary: 'Check configured OAuth 2.0 / OpenID Connect providers',
        description: 'Returns which social providers (Google, Apple) have client credentials populated in the environment.',
        responses: {
          '200': {
            description: 'Active OAuth providers returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthProviderConfig' },
              },
            },
          },
        },
      },
    },
    '/users/oauth': {
      post: {
        tags: ['OAuth 2.0 & OIDC'],
        summary: 'Initiate or complete OAuth 2.0 / OIDC authentication',
        description: 'Initiates 3-legged authorization code flow (returning provider authUrl with state & PKCE) or completes authentication.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuthInitRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OAuth authorization URL generated or user authenticated with 24h JWT token.',
          },
        },
      },
    },
    '/users/oauth/login/{provider}': {
      get: {
        tags: ['OAuth 2.0 & OIDC'],
        summary: 'Direct redirect to provider authorization consent screen (Google or Apple)',
        parameters: [
          { name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['google', 'apple'] } },
        ],
        responses: {
          '302': { description: 'Redirect to Google/Apple official authorization endpoint' },
        },
      },
    },
    '/users/oauth/callback/{provider}': {
      get: {
        tags: ['OAuth 2.0 & OIDC'],
        summary: 'OAuth 2.0 OIDC GET authorization code callback',
        description: 'Receives authorization code, validates CSRF state, exchanges code for tokens, verifies OIDC id_token signature using provider JWKS keys, auto-registers customer in PostgreSQL if missing, dispatches Welcome Email, and issues 24-hour JWT session.',
        parameters: [
          { name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['google', 'apple'] } },
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '302': { description: 'Redirect to frontend with auth token' },
        },
      },
      post: {
        tags: ['OAuth 2.0 & OIDC'],
        summary: 'OAuth 2.0 OIDC POST authorization code callback (Apple form_post mode)',
        parameters: [
          { name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['google', 'apple'] } },
        ],
        responses: {
          '302': { description: 'Redirect to frontend with auth token' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Catalog & Products'],
        summary: 'Filter and paginate products catalog from PostgreSQL',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category (fashion, electronics, audio, beauty)' },
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
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: 'prod_fash_01' } },
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
      put: {
        tags: ['Stores & Multi-Store Inventory'],
        summary: 'Adjust inventory stock count directly in PostgreSQL public.inventory (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', example: 'prod_fash_01' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['stock'],
                properties: {
                  storeId: { type: 'integer', example: 1 },
                  stock: { type: 'integer', example: 35 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Inventory stock updated successfully in PostgreSQL' },
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
    '/carts/user/{userId}': {
      get: {
        tags: ['Cart & Basket'],
        summary: 'Get cart for specific user from PostgreSQL public.cart table',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string', example: '1' } },
        ],
        responses: {
          '200': { description: 'User cart retrieved from PostgreSQL' },
        },
      },
    },
    '/wishlist': {
      get: {
        tags: ['Customer Wishlist'],
        summary: 'Get customer wishlist from PostgreSQL public.wishlist table',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Customer wishlist items returned from PostgreSQL' },
        },
      },
      post: {
        tags: ['Customer Wishlist'],
        summary: 'Add product to wishlist in PostgreSQL',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId'],
                properties: {
                  productId: { type: 'string', example: 'prod_fash_01' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Product added to wishlist in PostgreSQL' },
        },
      },
      delete: {
        tags: ['Customer Wishlist'],
        summary: 'Clear customer wishlist in PostgreSQL',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Wishlist cleared in PostgreSQL' },
        },
      },
    },
    '/orders/verify-otp': {
      post: {
        tags: ['Orders, Checkout & 2FA Gate'],
        summary: 'Verify simulated 2-Factor Gateway OTP Security Check (6-digit code)',
        description: 'Simulates the payment gateway 2FA security check before authorizing order charge.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyOtpRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'OTP verified successfully. Gateway payment pre-authorized.',
          },
          '400': {
            description: 'Invalid OTP code. Please enter a valid 6-digit verification code.',
          },
        },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders, Checkout & 2FA Gate'],
        summary: 'Create and place order with atomic PostgreSQL transaction (decrements inventory)',
        description: 'Enforces checkout authentication gate. Atomically decrements product stock, persists order & order_item records, clears basket, and dispatches an automated Order Confirmation Email via Zoho SMTP.',
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
            description: 'Order placed in PostgreSQL. Inventory decremented. Order confirmation email sent via Zoho SMTP.',
          },
        },
      },
      get: {
        tags: ['Orders, Checkout & 2FA Gate'],
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
        tags: ['Orders, Checkout & 2FA Gate'],
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
    '/orders/{id}/status': {
      put: {
        tags: ['Orders, Checkout & 2FA Gate'],
        summary: 'Update order fulfillment status in PostgreSQL and notify customer via Zoho SMTP (Admin)',
        description: 'Updates status to processing, shipped, or delivered. Triggers real-time customer status update email with tracking details via Zoho SMTP.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '2' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderStatusUpdateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Order status updated and customer notified via Zoho SMTP.',
          },
          '404': {
            description: 'Order not found in PostgreSQL',
          },
        },
      },
      patch: {
        tags: ['Orders, Checkout & 2FA Gate'],
        summary: 'Patch order fulfillment status (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '2' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderStatusUpdateRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Order status updated successfully' },
        },
      },
    },
    '/admin/analytics/summary': {
      get: {
        tags: ['Administrator Analytics & Controls'],
        summary: 'Retrieve live PostgreSQL revenue, order count, and low stock metrics (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Live business analytics and inventory alerts returned',
          },
          '403': {
            description: 'Forbidden: Administrator privileges required',
          },
        },
      },
    },
    '/admin/analytics/customers': {
      get: {
        tags: ['Administrator Analytics & Controls'],
        summary: 'List all registered customers with lifetime spend and order counts from PostgreSQL (Admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Customer list with aggregated spend metadata',
          },
        },
      },
    },
    '/admin/analytics/customers/{id}': {
      get: {
        tags: ['Administrator Analytics & Controls'],
        summary: 'Get customer detail profile with complete order history (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '1' } },
        ],
        responses: {
          '200': {
            description: 'Customer profile and historical purchase breakdown',
          },
        },
      },
    },
    '/admin/analytics/test-email': {
      post: {
        tags: ['Administrator Analytics & Controls'],
        summary: 'Test Zoho SMTP outbound mail server connection and delivery (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  to: { type: 'string', format: 'email', example: 'admin@practicesoftwaretesting.com' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Test email successfully sent via Zoho SMTP server',
          },
        },
      },
    },
    '/seed/reset': {
      post: {
        tags: ['QA & Test Utilities'],
        summary: 'Reset PostgreSQL database to pristine seed accounts and catalog',
        description: 'Executes DDL schema and re-populates PostgreSQL 18 tables (users, product, store, inventory, cart, order, order_item, product_reviews) for repeatable QA test runs. Restores admin and customer test accounts with pristine sequence IDs starting from 1.',
        responses: {
          '200': {
            description: 'PostgreSQL database successfully reset and re-seeded',
          },
        },
      },
    },
  },
};
