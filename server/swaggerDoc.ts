export const DOT_WORKFLOW_DEFINITION = "digraph ShopSphere_E2E_ECommerce_Flow {\n  graph [rankdir=TB, bgcolor=\"transparent\", fontname=\"Plus Jakarta Sans\", nodesep=0.6, ranksep=0.8];\n  node [shape=box, style=\"filled,rounded\", fontname=\"Plus Jakarta Sans\", fontsize=11, margin=\"0.25,0.15\"];\n  edge [fontname=\"JetBrains Mono\", fontsize=9, color=\"#94a3b8\", arrowsize=0.8];\n\n  // --- Subgraph: User Authentication & OIDC ---\n  subgraph cluster_auth {\n    label = \"1. Customer & Admin Authentication (PostgreSQL users table)\";\n    style = \"filled,rounded\";\n    color = \"#e2e8f0\";\n    fillcolor = \"#f8fafc\";\n    fontname = \"Plus Jakarta Sans\";\n    fontsize = 13;\n\n    Start [label=\"START\\nQA Test Session\", shape=ellipse, fillcolor=\"#3b82f6\", fontcolor=\"#ffffff\"];\n    Register [label=\"POST /api/users/register\\nCustomer Registration\\n(Status: 201 -> Welcome Email)\", fillcolor=\"#eff6ff\", color=\"#3b82f6\"];\n    Login [label=\"POST /api/users/login\\nAuth Credentials\\n(Status: 200 -> 24h JWT Bearer\\n403: Customer Denied in Admin Portal)\", fillcolor=\"#eff6ff\", color=\"#3b82f6\"];\n    OAuthProviders [label=\"GET /api/users/auth/providers\\nCheck Google & Apple Status\", fillcolor=\"#eff6ff\", color=\"#3b82f6\"];\n    OAuthFlow [label=\"GET /api/users/auth/login/{provider}\\n3-Legged OIDC Auth Code Flow\", fillcolor=\"#eff6ff\", color=\"#3b82f6\"];\n    OAuthCallback [label=\"GET/POST /api/users/auth/callback/{provider}\\nJWKS Verification & Auto-Registration\", fillcolor=\"#eff6ff\", color=\"#3b82f6\"];\n    GetMe [label=\"GET /api/users/me\\nVerify Authenticated Session & Role\\n(Customer / Administrator)\", fillcolor=\"#eff6ff\", color=\"#3b82f6\"];\n  }\n\n  // --- Subgraph: Multi-Category Catalog & Inventory ---\n  subgraph cluster_catalog {\n    label = \"2. Catalog Browsing & Multi-Store Inventory (product, store, inventory tables)\";\n    style = \"filled,rounded\";\n    color = \"#e2e8f0\";\n    fillcolor = \"#f8fafc\";\n    fontname = \"Plus Jakarta Sans\";\n    fontsize = 13;\n\n    BrowseCatalog [label=\"GET /api/products\\nBrowse Multi-Category Storefront\", fillcolor=\"#f0fdf4\", color=\"#22c55e\"];\n    Categories [label=\"GET /api/categories\\nTaxonomy & Hierarchies\", fillcolor=\"#f0fdf4\", color=\"#22c55e\"];\n    StoreStock [label=\"GET /api/stores & /api/inventory/:productId\\nMulti-Store Physical Availability\", fillcolor=\"#f0fdf4\", color=\"#22c55e\"];\n    ViewPDP [label=\"GET /api/products/:id & /products/slug/:slug\\nInspect PDP (Specs, Sizing, Colors)\", fillcolor=\"#f0fdf4\", color=\"#22c55e\"];\n    ProductReviews [label=\"GET & POST /api/products/:id/reviews\\nCustomer Reviews & Rating Aggregation\", fillcolor=\"#f0fdf4\", color=\"#22c55e\"];\n  }\n\n  // --- Subgraph: Cart & Basket Management ---\n  subgraph cluster_cart {\n    label = \"3. Basket & Cart Management (cart & wishlist tables in PostgreSQL)\";\n    style = \"filled,rounded\";\n    color = \"#e2e8f0\";\n    fillcolor = \"#f8fafc\";\n    fontname = \"Plus Jakarta Sans\";\n    fontsize = 13;\n\n    InitBasket [label=\"POST /api/cart & /api/carts\\nAdd Item or Init Basket Session\", fillcolor=\"#fefce8\", color=\"#eab308\"];\n    GetBasket [label=\"GET /api/cart & /api/carts/:basketId\\nRetrieve Cart & Total Item Count\", fillcolor=\"#fefce8\", color=\"#eab308\"];\n    UpdateCart [label=\"PATCH /api/cart/:itemId\\nUpdate Quantity & Options\", fillcolor=\"#fefce8\", color=\"#eab308\"];\n    DeleteBasketItem [label=\"DELETE /api/cart/:itemId & /api/cart\\nRemove Item / Clear Cart\", fillcolor=\"#fefce8\", color=\"#eab308\"];\n    WishlistOps [label=\"GET/POST/DELETE /api/wishlist\\nCustomer Wishlist Management\", fillcolor=\"#fefce8\", color=\"#eab308\"];\n  }\n\n  // --- Subgraph: Multi-Step Checkout & Payment ---\n  subgraph cluster_checkout {\n    label = \"4. Checkout & Payment Gateway (order & order_item tables with SQL transactions)\";\n    style = \"filled,rounded\";\n    color = \"#e2e8f0\";\n    fillcolor = \"#f8fafc\";\n    fontname = \"Plus Jakarta Sans\";\n    fontsize = 13;\n\n    AuthGate [label=\"Checkout Auth Gate\\nCheck Authenticated State\\n(Prompt Login if Guest)\", fillcolor=\"#faf5ff\", color=\"#a855f7\"];\n    ShippingStep [label=\"1. Address Selection & Form Validation\", fillcolor=\"#faf5ff\", color=\"#a855f7\"];\n    ShippingMethod [label=\"2. Delivery Method Selection\", fillcolor=\"#faf5ff\", color=\"#a855f7\"];\n    PaymentStep [label=\"3. Payment Method Selection\", fillcolor=\"#faf5ff\", color=\"#a855f7\"];\n    OTPStep [label=\"4. OTP Verification Gate\\nPOST /api/orders/verify-otp (6-Digit Code)\", fillcolor=\"#faf5ff\", color=\"#a855f7\"];\n    PlaceOrder [label=\"POST /api/orders\\nPlace Order (SQL Atomic Decrement)\\n(Status: 201 -> Confirmation Email)\", fillcolor=\"#faf5ff\", color=\"#a855f7\"];\n  }\n\n  // --- Subgraph: Post Purchase, Admin & Zoho Notifications ---\n  subgraph cluster_admin {\n    label = \"5. Admin Dashboard, Inventory & Moderation (Admin JWT)\";\n    style = \"filled,rounded\";\n    color = \"#fee2e2\";\n    fillcolor = \"#fff5f5\";\n    fontname = \"Plus Jakarta Sans\";\n    fontsize = 13;\n\n    AdminAnalytics [label=\"GET /api/admin/analytics/summary\\nSales, Customers & Order Totals\", fillcolor=\"#fee2e2\", color=\"#ef4444\"];\n    AdminProducts [label=\"POST/PUT/DELETE /api/admin/products\\nProduct Catalog Management\", fillcolor=\"#fee2e2\", color=\"#ef4444\"];\n    AdminInventory [label=\"GET & PATCH /api/admin/inventory\\nStock Levels & Low Stock Alerts\", fillcolor=\"#fee2e2\", color=\"#ef4444\"];\n    AdminOrders [label=\"GET & PATCH /api/admin/orders\\nOrder Status Lifecycle & Emails\", fillcolor=\"#fee2e2\", color=\"#ef4444\"];\n    AdminUsers [label=\"GET/PATCH/DELETE /api/admin/users\\nUser Management & Role Assignment\", fillcolor=\"#fee2e2\", color=\"#ef4444\"];\n    AdminReviews [label=\"GET & DELETE /api/admin/reviews\\nReview Moderation\", fillcolor=\"#fee2e2\", color=\"#ef4444\"];\n  }\n\n  // Flow Connections\n  Start -> Register [label=\"New User\"];\n  Start -> Login [label=\"Existing Account\"];\n  Start -> OAuthProviders [label=\"Check OAuth\"];\n  OAuthProviders -> OAuthFlow [label=\"Click Google/Apple\"];\n  OAuthFlow -> OAuthCallback [label=\"Consent Callback\"];\n  OAuthCallback -> GetMe [label=\"Bearer JWT\"];\n  Register -> Login [label=\"Redirect\"];\n  Login -> GetMe [label=\"Bearer JWT\"];\n  GetMe -> BrowseCatalog;\n  BrowseCatalog -> Categories;\n  BrowseCatalog -> StoreStock;\n  BrowseCatalog -> ViewPDP;\n  ViewPDP -> ProductReviews;\n  ViewPDP -> InitBasket [label=\"Add to Cart\"];\n  InitBasket -> GetBasket;\n  GetBasket -> UpdateCart;\n  GetBasket -> DeleteBasketItem;\n  GetBasket -> WishlistOps;\n  GetBasket -> AuthGate [label=\"Proceed to Checkout\"];\n  AuthGate -> ShippingStep [label=\"Customer Authenticated\"];\n  ShippingStep -> ShippingMethod;\n  ShippingMethod -> PaymentStep;\n  PaymentStep -> OTPStep [label=\"Gateway Verify\"];\n  OTPStep -> PlaceOrder [label=\"OTP Accepted\"];\n  PlaceOrder -> AdminOrders [label=\"Order Fulfillment\"];\n  AdminOrders -> AdminInventory [label=\"Stock Sync\"];\n  AdminInventory -> AdminAnalytics [label=\"KPI Aggregation\"];\n}";

export const SWAGGER_SPEC = {
  "openapi": "3.0.3",
  "info": {
    "title": "ShopSphere Full-Stack E-Commerce & Admin API (OpenAPI 3.0)",
    "version": "3.0.0",
    "description": "Complete REST API specification covering both **Customer POV** and **Admin POV** workflows, fully synchronized with the Express backend and PostgreSQL 18 database ('DataBase_for_SamEcommers').\n\n### Features & Architecture:\n- **Customer POV:** User Authentication, OIDC SSO (Google & Apple), Catalog Filters & Search, Categories, Physical Store Inventory, PDP Reviews, Persistent Cart & Wishlist, Multi-Step Checkout with OTP gate, and Customer Order History.\n- **Admin POV [Requires Admin JWT]:** Product Management (Create/Update/Delete/Featured), Multi-Store Inventory & Stock Alerts, Platform Order Fulfillment & Zoho Email Automation, Customer & User Management with Role Updates, Review Moderation, and Real-Time Analytics KPIs.\n- **Security:** Standard HTTP Bearer JWT authentication for authorized customer and administrator actions.",
    "contact": {
      "name": "QA Automation & Database Architecture Team",
      "email": "admin@practicesoftwaretesting.com"
    }
  },
  "servers": [
    {
      "url": "/api",
      "description": "Production & Local Express Backend API"
    }
  ],
  "tags": [
    {
      "name": "Customer - Auth",
      "description": "Customer registration, login, logout, profile, and OIDC SSO authentication"
    },
    {
      "name": "Customer - Products",
      "description": "Product catalog browsing, search, categories, store inventory, and PDP customer reviews"
    },
    {
      "name": "Customer - Cart & Wishlist",
      "description": "Shopping cart operations, basket sessions, item quantities, and user wishlist"
    },
    {
      "name": "Customer - Orders",
      "description": "Multi-step checkout, OTP verification gate, order placement, and customer order history"
    },
    {
      "name": "Admin - Products",
      "description": "[Requires Admin JWT] Administrator product catalog creation, updates, and deletion"
    },
    {
      "name": "Admin - Inventory",
      "description": "[Requires Admin JWT] Multi-store stock adjustments, inventory monitoring, and low-stock alerts"
    },
    {
      "name": "Admin - Orders",
      "description": "[Requires Admin JWT] Platform-wide order management, status updates, and automated notifications"
    },
    {
      "name": "Admin - Users & Analytics",
      "description": "[Requires Admin JWT] Customer activity metrics, user role management, platform analytics KPI summary, and store settings"
    },
    {
      "name": "Admin - Reviews & Moderation",
      "description": "[Requires Admin JWT] Review inspection, moderation, and content removal"
    },
    {
      "name": "Delivery Agents",
      "description": "Onboarding, email verification, temporary password issuance, delivery assignment, OTP settlement, and earnings wallet"
    },
    {
      "name": "Feedback & Reviews",
      "description": "Post-delivery review prompts, 5-star ratings, snoozing, and permanent opt-out"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter your 24-hour JWT token obtained from POST /users/login or POST /users/oauth. Admin endpoints require a token from an account with role: admin."
      }
    },
    "schemas": {
      "AuthLoginDTO": {
        "type": "object",
        "required": [
          "password"
        ],
        "properties": {
          "email": {
            "type": "string",
            "format": "email",
            "example": "customer@practicesoftwaretesting.com"
          },
          "username": {
            "type": "string",
            "example": "admin"
          },
          "password": {
            "type": "string",
            "example": "User01"
          },
          "portal": {
            "type": "string",
            "enum": [
              "customer",
              "admin"
            ],
            "example": "customer"
          },
          "requiredRole": {
            "type": "string",
            "enum": [
              "customer",
              "admin"
            ],
            "example": "customer"
          }
        }
      },
      "AuthRegisterDTO": {
        "type": "object",
        "required": [
          "name",
          "email",
          "password"
        ],
        "properties": {
          "name": {
            "type": "string",
            "example": "Jane Doe"
          },
          "email": {
            "type": "string",
            "format": "email",
            "example": "jane.doe@example.com"
          },
          "password": {
            "type": "string",
            "minLength": 6,
            "example": "SecurePass123!"
          },
          "phone": {
            "type": "string",
            "example": "+1 (555) 382-9912"
          },
          "role": {
            "type": "string",
            "enum": [
              "customer",
              "admin"
            ],
            "default": "customer",
            "example": "customer"
          }
        }
      },
      "UserProfileDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "user_a9f12b48"
          },
          "name": {
            "type": "string",
            "example": "Jane Doe"
          },
          "email": {
            "type": "string",
            "format": "email",
            "example": "jane.doe@example.com"
          },
          "username": {
            "type": "string",
            "example": "janedoe"
          },
          "role": {
            "type": "string",
            "enum": [
              "customer",
              "admin"
            ],
            "example": "customer"
          },
          "phone": {
            "type": "string",
            "example": "+1 (555) 382-9912"
          },
          "avatar": {
            "type": "string",
            "example": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
          },
          "address": {
            "type": "object",
            "properties": {
              "street": {
                "type": "string",
                "example": "123 Market Street"
              },
              "city": {
                "type": "string",
                "example": "San Francisco"
              },
              "state": {
                "type": "string",
                "example": "CA"
              },
              "postalCode": {
                "type": "string",
                "example": "94105"
              },
              "country": {
                "type": "string",
                "example": "United States"
              }
            }
          }
        }
      },
      "ProductDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "prod_f4b7a1"
          },
          "title": {
            "type": "string",
            "example": "Floral Summer Dress"
          },
          "slug": {
            "type": "string",
            "example": "floral-summer-dress"
          },
          "price": {
            "type": "number",
            "example": 79.99
          },
          "compareAtPrice": {
            "type": "number",
            "example": 99.99
          },
          "category": {
            "type": "string",
            "example": "fashion"
          },
          "subcategory": {
            "type": "string",
            "example": "Dresses"
          },
          "description": {
            "type": "string",
            "example": "Lightweight and breathable floral sundress for warm summer days."
          },
          "images": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "example": [
              "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80"
            ]
          },
          "stock": {
            "type": "integer",
            "example": 25
          },
          "rating": {
            "type": "number",
            "example": 4.8
          },
          "reviewsCount": {
            "type": "integer",
            "example": 14
          },
          "featured": {
            "type": "boolean",
            "example": true
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "example": [
              "summer",
              "floral",
              "trending"
            ]
          },
          "specifications": {
            "type": "object",
            "example": {
              "Material": "100% Organic Cotton",
              "Fit": "Relaxed"
            }
          }
        }
      },
      "ProductListResponseDTO": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": true
          },
          "data": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ProductDTO"
            }
          },
          "pagination": {
            "type": "object",
            "properties": {
              "total": {
                "type": "integer",
                "example": 36
              },
              "page": {
                "type": "integer",
                "example": 1
              },
              "totalPages": {
                "type": "integer",
                "example": 3
              },
              "limit": {
                "type": "integer",
                "example": 12
              }
            }
          }
        }
      },
      "CreateReviewDTO": {
        "type": "object",
        "required": [
          "userName",
          "rating",
          "comment"
        ],
        "properties": {
          "userName": {
            "type": "string",
            "example": "Alex Smith"
          },
          "userEmail": {
            "type": "string",
            "format": "email",
            "example": "alex.smith@example.com"
          },
          "rating": {
            "type": "integer",
            "minimum": 1,
            "maximum": 5,
            "example": 5
          },
          "comment": {
            "type": "string",
            "example": "Exceptional material quality, fits true to size and arrived ahead of schedule!"
          }
        }
      },
      "ReviewResponseDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "rev_m3x8y9"
          },
          "productId": {
            "type": "string",
            "example": "prod_f4b7a1"
          },
          "userName": {
            "type": "string",
            "example": "Alex Smith"
          },
          "userEmail": {
            "type": "string",
            "example": "alex.smith@example.com"
          },
          "rating": {
            "type": "integer",
            "example": 5
          },
          "comment": {
            "type": "string",
            "example": "Exceptional material quality, fits true to size."
          },
          "verifiedPurchase": {
            "type": "boolean",
            "example": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "example": "2026-11-16T10:00:00.000Z"
          }
        }
      },
      "AddToCartDTO": {
        "type": "object",
        "required": [
          "productId"
        ],
        "properties": {
          "productId": {
            "type": "string",
            "example": "prod_f4b7a1"
          },
          "quantity": {
            "type": "integer",
            "minimum": 1,
            "default": 1,
            "example": 2
          },
          "selectedVariant": {
            "type": "string",
            "example": "Medium / Rose Red"
          },
          "selectedColor": {
            "type": "string",
            "example": "Rose Red"
          },
          "selectedSize": {
            "type": "string",
            "example": "M"
          },
          "storeId": {
            "type": "integer",
            "example": 1
          },
          "basketId": {
            "type": "string",
            "example": "basket_8df7a2b91c"
          }
        }
      },
      "UpdateCartItemDTO": {
        "type": "object",
        "required": [
          "quantity"
        ],
        "properties": {
          "quantity": {
            "type": "integer",
            "minimum": 1,
            "example": 3
          },
          "selectedVariant": {
            "type": "string",
            "example": "Large / Navy Blue"
          },
          "basketId": {
            "type": "string",
            "example": "basket_8df7a2b91c"
          }
        }
      },
      "WishlistItemDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "wishlist_18"
          },
          "productId": {
            "type": "string",
            "example": "prod_f4b7a1"
          },
          "productName": {
            "type": "string",
            "example": "Floral Summer Dress"
          },
          "price": {
            "type": "number",
            "example": 79.99
          },
          "imageUrl": {
            "type": "string",
            "example": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "example": "2026-11-16T12:00:00.000Z"
          }
        }
      },
      "CreateOrderDTO": {
        "type": "object",
        "required": [
          "basketId",
          "shippingAddress"
        ],
        "properties": {
          "basketId": {
            "type": "string",
            "example": "basket_8df7a2b91c"
          },
          "shippingAddress": {
            "type": "object",
            "required": [
              "fullName",
              "street",
              "city",
              "postalCode"
            ],
            "properties": {
              "fullName": {
                "type": "string",
                "example": "Sampath Kumar"
              },
              "street": {
                "type": "string",
                "example": "100 Tech Boulevard, Suite 400"
              },
              "city": {
                "type": "string",
                "example": "Austin"
              },
              "state": {
                "type": "string",
                "example": "TX"
              },
              "postalCode": {
                "type": "string",
                "example": "78701"
              },
              "country": {
                "type": "string",
                "example": "United States"
              }
            }
          },
          "shippingMethod": {
            "type": "string",
            "enum": [
              "standard",
              "express",
              "priority"
            ],
            "default": "standard",
            "example": "standard"
          },
          "paymentMethod": {
            "type": "string",
            "enum": [
              "credit_card",
              "upi",
              "net_banking",
              "cod"
            ],
            "default": "credit_card",
            "example": "credit_card"
          },
          "userEmail": {
            "type": "string",
            "format": "email",
            "example": "customer@practicesoftwaretesting.com"
          },
          "userName": {
            "type": "string",
            "example": "Sampath Kumar"
          }
        }
      },
      "OrderResponseDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "24"
          },
          "orderNumber": {
            "type": "string",
            "example": "ORD-2026-78491"
          },
          "userId": {
            "type": "string",
            "example": "user_a9f12b48"
          },
          "userEmail": {
            "type": "string",
            "example": "customer@practicesoftwaretesting.com"
          },
          "userName": {
            "type": "string",
            "example": "Sampath Kumar"
          },
          "orderStatus": {
            "type": "string",
            "enum": [
              "pending",
              "processing",
              "out_for_delivery",
              "shipped",
              "delivered",
              "cancelled"
            ],
            "example": "processing"
          },
          "totalAmount": {
            "type": "number",
            "example": 179.98
          },
          "subtotal": {
            "type": "number",
            "example": 159.98
          },
          "tax": {
            "type": "number",
            "example": 12.8
          },
          "shippingFee": {
            "type": "number",
            "example": 7.2
          },
          "shippingMethod": {
            "type": "string",
            "example": "standard"
          },
          "paymentMethod": {
            "type": "string",
            "example": "credit_card"
          },
          "paymentStatus": {
            "type": "string",
            "example": "paid"
          },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer",
                  "example": 42
                },
                "productId": {
                  "type": "string",
                  "example": "prod_f4b7a1"
                },
                "productName": {
                  "type": "string",
                  "example": "Floral Summer Dress"
                },
                "price": {
                  "type": "number",
                  "example": 79.99
                },
                "quantity": {
                  "type": "integer",
                  "example": 2
                }
              }
            }
          },
          "shippingAddress": {
            "type": "object",
            "properties": {
              "fullName": {
                "type": "string",
                "example": "Sampath Kumar"
              },
              "street": {
                "type": "string",
                "example": "100 Tech Boulevard"
              },
              "city": {
                "type": "string",
                "example": "Austin"
              },
              "state": {
                "type": "string",
                "example": "TX"
              },
              "postalCode": {
                "type": "string",
                "example": "78701"
              },
              "country": {
                "type": "string",
                "example": "United States"
              }
            }
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "example": "2026-11-16T14:30:00.000Z"
          }
        }
      },
      "CreateProductDTO": {
        "type": "object",
        "required": [
          "title",
          "price",
          "category"
        ],
        "properties": {
          "title": {
            "type": "string",
            "example": "Noise Cancelling Wireless Headphones"
          },
          "slug": {
            "type": "string",
            "example": "noise-cancelling-wireless-headphones"
          },
          "price": {
            "type": "number",
            "example": 199.99
          },
          "compareAtPrice": {
            "type": "number",
            "example": 249.99
          },
          "category": {
            "type": "string",
            "example": "audio"
          },
          "subcategory": {
            "type": "string",
            "example": "Headphones"
          },
          "description": {
            "type": "string",
            "example": "Industry-leading active noise cancellation with 40-hour battery life."
          },
          "images": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "example": [
              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"
            ]
          },
          "stock": {
            "type": "integer",
            "example": 40
          },
          "featured": {
            "type": "boolean",
            "example": true
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "example": [
              "audio",
              "bluetooth",
              "wireless"
            ]
          },
          "specifications": {
            "type": "object",
            "example": {
              "Battery": "40 Hours",
              "Bluetooth": "5.3",
              "ANC": "Hybrid"
            }
          }
        }
      },
      "UpdateProductDTO": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "example": "Noise Cancelling Wireless Headphones Pro"
          },
          "price": {
            "type": "number",
            "example": 189.99
          },
          "compareAtPrice": {
            "type": "number",
            "example": 239.99
          },
          "category": {
            "type": "string",
            "example": "audio"
          },
          "subcategory": {
            "type": "string",
            "example": "Headphones"
          },
          "description": {
            "type": "string",
            "example": "Updated pro audio model with custom spatial sound profile."
          },
          "images": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "stock": {
            "type": "integer",
            "example": 50
          },
          "featured": {
            "type": "boolean",
            "example": true
          }
        }
      },
      "UpdateInventoryDTO": {
        "type": "object",
        "required": [
          "stock"
        ],
        "properties": {
          "storeId": {
            "type": "integer",
            "default": 1,
            "example": 1
          },
          "stock": {
            "type": "integer",
            "minimum": 0,
            "example": 75
          }
        }
      },
      "InventoryResponseDTO": {
        "type": "object",
        "properties": {
          "productId": {
            "type": "integer",
            "example": 1
          },
          "productCode": {
            "type": "string",
            "example": "prod_f4b7a1"
          },
          "productName": {
            "type": "string",
            "example": "Floral Summer Dress"
          },
          "category": {
            "type": "string",
            "example": "fashion"
          },
          "price": {
            "type": "number",
            "example": 79.99
          },
          "storeId": {
            "type": "integer",
            "example": 1
          },
          "storeName": {
            "type": "string",
            "example": "Downtown Flagship Store"
          },
          "stockAvailable": {
            "type": "integer",
            "example": 25
          },
          "isLowStock": {
            "type": "boolean",
            "example": false
          }
        }
      },
      "UpdateOrderStatusDTO": {
        "type": "object",
        "required": [
          "status"
        ],
        "properties": {
          "status": {
            "type": "string",
            "enum": [
              "pending",
              "processing",
              "out_for_delivery",
              "shipped",
              "delivered",
              "cancelled"
            ],
            "example": "shipped"
          }
        }
      },
      "AdminOrderResponseDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "24"
          },
          "orderNumber": {
            "type": "string",
            "example": "ORD-2026-78491"
          },
          "userId": {
            "type": "string",
            "example": "1"
          },
          "userEmail": {
            "type": "string",
            "example": "customer@practicesoftwaretesting.com"
          },
          "userName": {
            "type": "string",
            "example": "Sampath Kumar"
          },
          "orderStatus": {
            "type": "string",
            "example": "shipped"
          },
          "totalAmount": {
            "type": "number",
            "example": 179.98
          },
          "paymentStatus": {
            "type": "string",
            "example": "paid"
          },
          "shippingMethod": {
            "type": "string",
            "example": "standard"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "example": "2026-11-16T14:30:00.000Z"
          }
        }
      },
      "UpdateUserRoleDTO": {
        "type": "object",
        "required": [
          "role"
        ],
        "properties": {
          "role": {
            "type": "string",
            "enum": [
              "customer",
              "admin"
            ],
            "example": "admin"
          }
        }
      },
      "AdminUserResponseDTO": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "example": "user_a9f12b48"
          },
          "numericId": {
            "type": "integer",
            "example": 4
          },
          "name": {
            "type": "string",
            "example": "Jane Customer"
          },
          "username": {
            "type": "string",
            "example": "janecustomer"
          },
          "email": {
            "type": "string",
            "format": "email",
            "example": "customer@practicesoftwaretesting.com"
          },
          "role": {
            "type": "string",
            "enum": [
              "customer",
              "admin"
            ],
            "example": "customer"
          },
          "phone": {
            "type": "string",
            "example": "+1 (555) 482-9102"
          },
          "avatar": {
            "type": "string",
            "example": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
          },
          "ordersCount": {
            "type": "integer",
            "example": 5
          },
          "totalSpent": {
            "type": "number",
            "example": 849.5
          },
          "cartItemsCount": {
            "type": "integer",
            "example": 2
          },
          "wishlistItemsCount": {
            "type": "integer",
            "example": 3
          },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "example": "2026-11-10T08:00:00.000Z"
          }
        }
      },
      "AnalyticsSummaryDTO": {
        "type": "object",
        "properties": {
          "totalCustomers": {
            "type": "integer",
            "example": 12
          },
          "totalOrders": {
            "type": "integer",
            "example": 48
          },
          "totalSales": {
            "type": "number",
            "example": 6842.5
          },
          "totalCartItems": {
            "type": "integer",
            "example": 16
          },
          "totalWishlistItems": {
            "type": "integer",
            "example": 27
          }
        }
      },
      "UpdateStoreDTO": {
        "type": "object",
        "properties": {
          "storeId": {
            "type": "integer",
            "default": 1,
            "example": 1
          },
          "name": {
            "type": "string",
            "example": "ShopSphere Flagship Store - San Francisco"
          },
          "address": {
            "type": "string",
            "example": "500 Howard Street, San Francisco, CA 94105"
          },
          "phone": {
            "type": "string",
            "example": "+1 (415) 555-0199"
          }
        }
      },
      "ApiResponseMessage": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": true
          },
          "message": {
            "type": "string",
            "example": "Operation completed successfully"
          }
        }
      },
      "ErrorResponse400": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "message": {
            "type": "string",
            "example": "Validation failed. Required fields are missing."
          },
          "errors": {
            "type": "object",
            "example": {
              "email": "Invalid email address format"
            }
          }
        }
      },
      "ErrorResponse401": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "message": {
            "type": "string",
            "example": "Unauthorized. Authentication token is missing or expired."
          }
        }
      },
      "ErrorResponse403": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "message": {
            "type": "string",
            "example": "Forbidden. Administrator privileges required."
          }
        }
      },
      "ErrorResponse404": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "message": {
            "type": "string",
            "example": "Requested resource was not found in PostgreSQL database."
          }
        }
      },
      "AvatarUploadDTO": {
        "type": "object",
        "required": ["avatarUrl"],
        "properties": {
          "avatarUrl": {
            "type": "string",
            "description": "Base64 data URI (data:image/jpeg;base64,... or data:image/png;base64,...) or image URL up to 5MB",
            "example": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
          }
        }
      },
      "DeliveryAgentDTO": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "example": "agt_9x8k1" },
          "name": { "type": "string", "example": "Alex Rivers" },
          "email": { "type": "string", "format": "email", "example": "agent.alex@shopsphere.test" },
          "phone": { "type": "string", "example": "+1 555-019-2831" },
          "gender": { "type": "string", "enum": ["male", "female", "non-binary", "prefer_not_to_say"], "example": "male" },
          "avatarUrl": { "type": "string", "example": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
          "vehicleType": { "type": "string", "example": "Electric Scooter" },
          "deliveryZone": { "type": "string", "example": "Downtown & Metro Core" },
          "status": { "type": "string", "enum": ["active", "inactive", "busy"], "example": "active" },
          "totalDeliveries": { "type": "integer", "example": 24 },
          "earnings": { "type": "number", "example": 360.00 },
          "commissionRate": { "type": "number", "example": 15.00 },
          "emailVerified": { "type": "boolean", "example": true },
          "mustChangePassword": { "type": "boolean", "example": false }
        }
      },
      "AgentRegistrationDTO": {
        "type": "object",
        "required": ["name", "email", "phone", "gender"],
        "properties": {
          "name": { "type": "string", "example": "Jordan Lee" },
          "email": { "type": "string", "format": "email", "example": "jordan.lee@shopsphere.test" },
          "phone": { "type": "string", "example": "+1 555-019-9988" },
          "gender": { "type": "string", "enum": ["male", "female", "non-binary", "prefer_not_to_say"], "example": "non-binary" },
          "avatarUrl": { "type": "string", "example": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" },
          "vehicleType": { "type": "string", "example": "E-Bike" },
          "deliveryZone": { "type": "string", "example": "North District" }
        }
      },
      "AgentVerifyEmailDTO": {
        "type": "object",
        "required": ["email", "token"],
        "properties": {
          "email": { "type": "string", "format": "email", "example": "jordan.lee@shopsphere.test" },
          "token": { "type": "string", "example": "d7a4f910b..." }
        }
      },
      "AgentLoginDTO": {
        "type": "object",
        "required": ["email", "password"],
        "properties": {
          "email": { "type": "string", "format": "email", "example": "jordan.lee@shopsphere.test" },
          "password": { "type": "string", "example": "Tmp#8f29A!" }
        }
      },
      "AgentChangePasswordDTO": {
        "type": "object",
        "required": ["currentPassword", "newPassword"],
        "properties": {
          "currentPassword": { "type": "string", "example": "Tmp#8f29A!" },
          "newPassword": { "type": "string", "example": "Secure#Pass2026" }
        }
      },
      "VerifyDeliveryOtpDTO": {
        "type": "object",
        "required": ["otp"],
        "properties": {
          "otp": { "type": "string", "minLength": 6, "maxLength": 6, "example": "481920" }
        }
      },
      "CollectPaymentDTO": {
        "type": "object",
        "required": ["method", "otp"],
        "properties": {
          "method": { "type": "string", "enum": ["cash", "upi"], "example": "cash" },
          "otp": { "type": "string", "minLength": 6, "maxLength": 6, "example": "481920" },
          "reference": { "type": "string", "example": "UPI-REF-891024" }
        }
      },
      "FeedbackSubmitDTO": {
        "type": "object",
        "required": ["rating"],
        "properties": {
          "rating": { "type": "integer", "minimum": 1, "maximum": 5, "example": 5 },
          "comment": { "type": "string", "example": "Fast delivery, courteous agent!" }
        }
      }
    }
  },
  "paths": {
    "/users/register": {
      "post": {
        "tags": [
          "Customer - Auth"
        ],
        "summary": "Register new customer account",
        "description": "Creates a new customer profile in PostgreSQL (status 201) and triggers asynchronous Zoho welcome confirmation email.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AuthRegisterDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Customer registered successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          },
          "400": {
            "description": "Validation failed or duplicate email",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse400"
                }
              }
            }
          }
        }
      }
    },
    "/users/login": {
      "post": {
        "tags": [
          "Customer - Auth"
        ],
        "summary": "Authenticate customer or administrator credentials",
        "description": "Validates user credentials against PostgreSQL hashed password and generates a signed 24-hour JWT Bearer token. Enforces strict role isolation (standard customers are rejected when attempting to authenticate on the Admin Portal).",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AuthLoginDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Authentication successful with JWT token",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "user": {
                          "$ref": "#/components/schemas/UserProfileDTO"
                        },
                        "token": {
                          "type": "string",
                          "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        },
                        "expiresIn": {
                          "type": "string",
                          "example": "24h"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Invalid credentials or inactive account",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse401"
                }
              }
            }
          },
          "403": {
            "description": "Role access denied (e.g. standard customer attempting Admin Portal login)",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse403"
                }
              }
            }
          }
        }
      }
    },
    "/users/logout": {
      "post": {
        "tags": [
          "Customer - Auth"
        ],
        "summary": "Invalidate customer or administrator session",
        "description": "Terminates active session and confirms client-side JWT token discarding.",
        "responses": {
          "200": {
            "description": "Logged out successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          }
        }
      }
    },
    "/users/forgot-password": {
      "post": {
        "tags": [
          "Customer - Auth"
        ],
        "summary": "Request customer password reset verification OTP",
        "description": "Generates a 6-digit numeric OTP and 32-byte cryptographic token with a 15-minute expiry, dispatched to the user's registered email via Brevo / Zoho SMTP. Explicitly rejects administrator accounts.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email"],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "customer@practicesoftwaretesting.com"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP and reset link dispatched to email",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          },
          "400": {
            "description": "Invalid email format or missing parameter"
          },
          "403": {
            "description": "Password reset restricted for administrator accounts"
          },
          "404": {
            "description": "No registered account found with given email"
          }
        }
      }
    },
    "/users/reset-password": {
      "post": {
        "tags": [
          "Customer - Auth"
        ],
        "summary": "Verify OTP and set new customer password",
        "description": "Validates the 6-digit OTP code or reset token sent to the user's email, hashes the new password with bcrypt (10 rounds), updates PostgreSQL public.users, invalidates the OTP, and triggers a confirmation email.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email", "newPassword"],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "customer@practicesoftwaretesting.com"
                  },
                  "otp": {
                    "type": "string",
                    "example": "482910"
                  },
                  "token": {
                    "type": "string",
                    "example": "a1b2c3d4e5f6..."
                  },
                  "newPassword": {
                    "type": "string",
                    "minLength": 6,
                    "example": "User01@NewPass"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Password reset successfully in PostgreSQL"
          },
          "400": {
            "description": "Invalid OTP, expired code, or password too short"
          },
          "403": {
            "description": "Reset restricted for administrator accounts"
          }
        }
      }
    },
    "/users/me": {
      "get": {
        "tags": [
          "Customer - Auth"
        ],
        "summary": "Get current authenticated user profile",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Current profile retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/UserProfileDTO"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Missing or invalid token",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse401"
                }
              }
            }
          }
        }
      }
    },
    "/users/profile": {
      "put": {
        "tags": [
          "Customer - Auth"
        ],
        "summary": "Update customer profile and shipping defaults",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserProfileDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Profile updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse401"
                }
              }
            }
          }
        }
      }
    },
    "/users/auth/providers": {
      "get": {
        "tags": [
          "Customer - Auth"
        ],
        "summary": "Check Google & Apple OIDC SSO status",
        "responses": {
          "200": {
            "description": "List of enabled OAuth/OIDC identity providers",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "providers": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string",
                            "example": "google"
                          },
                          "name": {
                            "type": "string",
                            "example": "Google"
                          },
                          "enabled": {
                            "type": "boolean",
                            "example": true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/products": {
      "get": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Browse catalog with search, price filters, and pagination",
        "parameters": [
          {
            "name": "category",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "example": "fashion"
          },
          {
            "name": "search",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "example": "dress"
          },
          {
            "name": "minPrice",
            "in": "query",
            "schema": {
              "type": "number"
            },
            "example": 20
          },
          {
            "name": "maxPrice",
            "in": "query",
            "schema": {
              "type": "number"
            },
            "example": 150
          },
          {
            "name": "sort",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "price-asc",
                "price-desc",
                "rating",
                "newest"
              ]
            },
            "example": "price-asc"
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            },
            "example": 1
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 12
            },
            "example": 12
          },
          {
            "name": "storeId",
            "in": "query",
            "schema": {
              "type": "integer"
            },
            "example": 1
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated product catalog",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ProductListResponseDTO"
                }
              }
            }
          }
        }
      }
    },
    "/products/{id}": {
      "get": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Get single product by ID or product_code",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "responses": {
          "200": {
            "description": "Product details retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/ProductDTO"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Product not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      }
    },
    "/products/slug/{slug}": {
      "get": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Get product by URL-friendly slug",
        "parameters": [
          {
            "name": "slug",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "floral-summer-dress"
          }
        ],
        "responses": {
          "200": {
            "description": "Product retrieved by slug",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/ProductDTO"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Product not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      }
    },
    "/categories": {
      "get": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Get product categories and taxonomy",
        "responses": {
          "200": {
            "description": "Category hierarchy list",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string",
                            "example": "fashion"
                          },
                          "name": {
                            "type": "string",
                            "example": "Fashion & Apparel"
                          },
                          "slug": {
                            "type": "string",
                            "example": "fashion"
                          },
                          "icon": {
                            "type": "string",
                            "example": "shirt"
                          },
                          "subcategories": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            },
                            "example": [
                              "Men",
                              "Women",
                              "Footwear"
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/stores": {
      "get": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Get physical retail store locations",
        "responses": {
          "200": {
            "description": "List of retail physical stores",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/UpdateStoreDTO"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/inventory/{productId}": {
      "get": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Check store stock availability for a product",
        "parameters": [
          {
            "name": "productId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "responses": {
          "200": {
            "description": "Inventory levels across physical stores",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/InventoryResponseDTO"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/products/{id}/reviews": {
      "get": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Get all reviews for a product",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "responses": {
          "200": {
            "description": "List of customer reviews",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/ReviewResponseDTO"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Submit a product review and recalculate rating",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateReviewDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Review saved and rating updated",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "message": {
                      "type": "string",
                      "example": "Review submitted successfully"
                    },
                    "data": {
                      "$ref": "#/components/schemas/ReviewResponseDTO"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Missing required review fields",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse400"
                }
              }
            }
          }
        }
      }
    },
    "/reviews/{id}": {
      "put": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Edit customer review",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "rev_m3x8y9"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "rating": {
                    "type": "integer",
                    "example": 4
                  },
                  "comment": {
                    "type": "string",
                    "example": "Updated comment after washing."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Review updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          },
          "404": {
            "description": "Review not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Customer - Products"
        ],
        "summary": "Delete customer review",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "rev_m3x8y9"
          }
        ],
        "responses": {
          "204": {
            "description": "Review deleted successfully"
          },
          "404": {
            "description": "Review not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      }
    },
    "/cart": {
      "get": {
        "tags": [
          "Customer - Cart & Wishlist"
        ],
        "summary": "Get current customer cart items and totals",
        "parameters": [
          {
            "name": "basketId",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "example": "basket_8df7a2b91c"
          }
        ],
        "responses": {
          "200": {
            "description": "Current cart object",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "example": "basket_8df7a2b91c"
                        },
                        "items": {
                          "type": "array",
                          "items": {
                            "$ref": "#/components/schemas/AddToCartDTO"
                          }
                        },
                        "totalItemCount": {
                          "type": "integer",
                          "example": 2
                        },
                        "subtotal": {
                          "type": "number",
                          "example": 159.98
                        },
                        "estimatedTax": {
                          "type": "number",
                          "example": 12.8
                        },
                        "shippingFee": {
                          "type": "number",
                          "example": 7.2
                        },
                        "grandTotal": {
                          "type": "number",
                          "example": 179.98
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Customer - Cart & Wishlist"
        ],
        "summary": "Add item to shopping cart or initialize basket",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AddToCartDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Item added or basket initialized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          },
          "400": {
            "description": "Invalid product or quantity",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse400"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Customer - Cart & Wishlist"
        ],
        "summary": "Clear all items from current cart",
        "responses": {
          "204": {
            "description": "Cart cleared successfully"
          }
        }
      }
    },
    "/cart/{itemId}": {
      "patch": {
        "tags": [
          "Customer - Cart & Wishlist"
        ],
        "summary": "Update cart item quantity",
        "parameters": [
          {
            "name": "itemId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateCartItemDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Cart quantity updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Customer - Cart & Wishlist"
        ],
        "summary": "Remove specific item from shopping cart",
        "parameters": [
          {
            "name": "itemId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "responses": {
          "204": {
            "description": "Item removed from cart"
          }
        }
      }
    },
    "/wishlist": {
      "get": {
        "tags": [
          "Customer - Cart & Wishlist"
        ],
        "summary": "Get user saved wishlist items",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Wishlist items retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/WishlistItemDTO"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse401"
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Customer - Cart & Wishlist"
        ],
        "summary": "Add product to wishlist",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "productId"
                ],
                "properties": {
                  "productId": {
                    "type": "string",
                    "example": "prod_f4b7a1"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Product added to wishlist",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse401"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Customer - Cart & Wishlist"
        ],
        "summary": "Clear entire wishlist",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "204": {
            "description": "Wishlist cleared"
          }
        }
      }
    },
    "/wishlist/{productId}": {
      "delete": {
        "tags": [
          "Customer - Cart & Wishlist"
        ],
        "summary": "Remove product from wishlist",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "productId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "responses": {
          "200": {
            "description": "Product removed from wishlist",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          }
        }
      }
    },
    "/orders/verify-otp": {
      "post": {
        "tags": [
          "Customer - Orders"
        ],
        "summary": "Verify simulated 6-digit payment OTP code",
        "description": "Simulates the 2-Factor Gateway OTP verification step during the checkout flow.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "otpCode"
                ],
                "properties": {
                  "otpCode": {
                    "type": "string",
                    "example": "123456"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP verified successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          },
          "400": {
            "description": "Invalid or missing OTP code",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse400"
                }
              }
            }
          }
        }
      }
    },
    "/orders": {
      "post": {
        "tags": [
          "Customer - Orders"
        ],
        "summary": "Place and finalize order (SQL transaction with atomic stock decrement)",
        "description": "Executes atomic order creation in PostgreSQL, decrements product stock, clears customer cart, and queues Zoho Mail order confirmation.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateOrderDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Order created and persisted in PostgreSQL",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "message": {
                      "type": "string",
                      "example": "Order placed successfully"
                    },
                    "data": {
                      "$ref": "#/components/schemas/OrderResponseDTO"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Empty cart or invalid shipping details",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse400"
                }
              }
            }
          }
        }
      },
      "get": {
        "tags": [
          "Customer - Orders"
        ],
        "summary": "Get customer order history",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "List of placed orders",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/OrderResponseDTO"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse401"
                }
              }
            }
          }
        }
      }
    },
    "/orders/{id}": {
      "get": {
        "tags": [
          "Customer - Orders"
        ],
        "summary": "Get order details by order ID or orderNumber",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "ORD-2026-78491"
          }
        ],
        "responses": {
          "200": {
            "description": "Order details retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/OrderResponseDTO"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Order not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      }
    },
    "/orders/{id}/cancel": {
      "patch": {
        "tags": [
          "Customer - Orders"
        ],
        "summary": "Cancel placed order (Restores inventory stock in PostgreSQL)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "ORD-2026-78491"
          }
        ],
        "responses": {
          "200": {
            "description": "Order cancelled and stock restored",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "message": {
                      "type": "string",
                      "example": "Order successfully cancelled in PostgreSQL"
                    },
                    "data": {
                      "$ref": "#/components/schemas/OrderResponseDTO"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Order is already shipped or delivered",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse400"
                }
              }
            }
          },
          "404": {
            "description": "Order not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      }
    },
    "/admin/products": {
      "post": {
        "tags": [
          "Admin - Products"
        ],
        "summary": "[Requires Admin JWT] Create new product in catalog",
        "description": "Inserts new product into PostgreSQL `product` table and initializes default inventory.",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateProductDTO"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Product created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/ProductDTO"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse401"
                }
              }
            }
          },
          "403": {
            "description": "Admin access required",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse403"
                }
              }
            }
          }
        }
      }
    },
    "/admin/products/{id}": {
      "put": {
        "tags": [
          "Admin - Products"
        ],
        "summary": "[Requires Admin JWT] Update full product details",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateProductDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Product updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/ProductDTO"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Product not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Admin - Products"
        ],
        "summary": "[Requires Admin JWT] Delete product from catalog",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "responses": {
          "204": {
            "description": "Product deleted successfully"
          },
          "404": {
            "description": "Product not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      }
    },
    "/admin/products/{id}/featured": {
      "patch": {
        "tags": [
          "Admin - Products"
        ],
        "summary": "[Requires Admin JWT] Toggle product featured status",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "featured": {
                    "type": "boolean",
                    "example": true
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Product featured status toggled",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          }
        }
      }
    },
    "/admin/inventory": {
      "get": {
        "tags": [
          "Admin - Inventory"
        ],
        "summary": "[Requires Admin JWT] List multi-store stock levels and low-stock alerts",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Inventory levels across all stores and products",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "count": {
                      "type": "integer",
                      "example": 36
                    },
                    "lowStockCount": {
                      "type": "integer",
                      "example": 4
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/InventoryResponseDTO"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/inventory/{productId}": {
      "patch": {
        "tags": [
          "Admin - Inventory"
        ],
        "summary": "[Requires Admin JWT] Adjust stock for product in store inventory",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "productId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "prod_f4b7a1"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateInventoryDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Stock updated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          }
        }
      }
    },
    "/admin/orders": {
      "get": {
        "tags": [
          "Admin - Orders"
        ],
        "summary": "[Requires Admin JWT] List all orders across all customers with status filters",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "pending",
                "processing",
                "shipped",
                "delivered",
                "cancelled"
              ]
            },
            "example": "processing"
          }
        ],
        "responses": {
          "200": {
            "description": "Platform orders list",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "count": {
                      "type": "integer",
                      "example": 48
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/AdminOrderResponseDTO"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/orders/{id}": {
      "get": {
        "tags": [
          "Admin - Orders"
        ],
        "summary": "[Requires Admin JWT] Get detailed order breakdown with items and customer info",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "ORD-2026-78491"
          }
        ],
        "responses": {
          "200": {
            "description": "Detailed order structure",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/OrderResponseDTO"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/orders/{id}/status": {
      "patch": {
        "tags": [
          "Admin - Orders"
        ],
        "summary": "[Requires Admin JWT] Update order fulfillment status & trigger customer notification",
        "description": "Updates status in PostgreSQL and automatically sends status change email via Zoho SMTP.",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "ORD-2026-78491"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateOrderStatusDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Order status updated and notification queued",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          },
          "400": {
            "description": "Invalid status value",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse400"
                }
              }
            }
          }
        }
      }
    },
    "/admin/users": {
      "get": {
        "tags": [
          "Admin - Users & Analytics"
        ],
        "summary": "[Requires Admin JWT] List all registered users with spend & order metrics",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "User list with analytics metrics",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "count": {
                      "type": "integer",
                      "example": 12
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/AdminUserResponseDTO"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/users/{id}": {
      "get": {
        "tags": [
          "Admin - Users & Analytics"
        ],
        "summary": "[Requires Admin JWT] Deep inspection of user profile, orders, cart, and wishlist",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "user_a9f12b48"
          }
        ],
        "responses": {
          "200": {
            "description": "Detailed user profile and transaction history",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AdminUserResponseDTO"
                }
              }
            }
          },
          "404": {
            "description": "User not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Admin - Users & Analytics"
        ],
        "summary": "[Requires Admin JWT] Delete customer account",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "user_a9f12b48"
          }
        ],
        "responses": {
          "204": {
            "description": "Customer account deleted"
          },
          "404": {
            "description": "User not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      }
    },
    "/admin/users/{id}/role": {
      "patch": {
        "tags": [
          "Admin - Users & Analytics"
        ],
        "summary": "[Requires Admin JWT] Update user role (admin | customer)",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "user_a9f12b48"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateUserRoleDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "User role updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          }
        }
      }
    },
    "/admin/analytics/summary": {
      "get": {
        "tags": [
          "Admin - Users & Analytics"
        ],
        "summary": "[Requires Admin JWT] Real-time platform KPI analytics summary",
        "description": "Computes total registered customers, total orders, lifetime sales revenue, total cart items, and wishlist totals from PostgreSQL.",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Platform analytics totals",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "data": {
                      "$ref": "#/components/schemas/AnalyticsSummaryDTO"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/analytics/test-email": {
      "post": {
        "tags": [
          "Admin - Users & Analytics"
        ],
        "summary": "[Requires Admin JWT] Trigger test verification email via Zoho Mail SMTP",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "sampathkumarveesam@zohomail.in"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Test email successfully transmitted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          }
        }
      }
    },
    "/admin/store": {
      "put": {
        "tags": [
          "Admin - Users & Analytics"
        ],
        "summary": "[Requires Admin JWT] Update store settings and contact info",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateStoreDTO"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Store settings updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          }
        }
      }
    },
    "/seed/reset": {
      "post": {
        "tags": [
          "Admin - Users & Analytics"
        ],
        "summary": "[Requires Admin JWT] Reset database seed & verify admin/QA accounts",
        "description": "Restores initial test administrator and customer accounts in PostgreSQL 18 for pristine QA automation runs.",
        "responses": {
          "200": {
            "description": "PostgreSQL database verified and seed accounts restored",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiResponseMessage"
                }
              }
            }
          }
        }
      }
    },
    "/admin/reviews": {
      "get": {
        "tags": [
          "Admin - Reviews & Moderation"
        ],
        "summary": "[Requires Admin JWT] List all customer reviews for content moderation",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "All product reviews across the catalog",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "count": {
                      "type": "integer",
                      "example": 25
                    },
                    "data": {
                      "type": "array",
                      "items": {
                        "$ref": "#/components/schemas/ReviewResponseDTO"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/reviews/{id}": {
      "delete": {
        "tags": [
          "Admin - Reviews & Moderation"
        ],
        "summary": "[Requires Admin JWT] Delete / moderate inappropriate review",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "rev_m3x8y9"
          }
        ],
        "responses": {
          "204": {
            "description": "Review removed by administrator"
          },
          "404": {
            "description": "Review not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse404"
                }
              }
            }
          }
        }
      }
    },
    "/users/profile/avatar": {
      "post": {
        "tags": ["Customer - Auth"],
        "summary": "Upload custom avatar image (JPG/PNG, up to 5MB Base64)",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/AvatarUploadDTO" }
            }
          }
        },
        "responses": {
          "200": { "description": "Avatar updated successfully" },
          "400": { "description": "Invalid image payload or size exceeds 5MB" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/orders/pending-feedback": {
      "get": {
        "tags": ["Feedback & Reviews"],
        "summary": "Retrieve delivered orders awaiting customer feedback",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of orders pending review" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/orders/{id}/feedback": {
      "post": {
        "tags": ["Feedback & Reviews"],
        "summary": "Submit rating and review for delivered order",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" }, "example": "ORD-109434-SP" }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/FeedbackSubmitDTO" }
            }
          }
        },
        "responses": {
          "200": { "description": "Feedback submitted successfully" },
          "400": { "description": "Invalid rating or comment" },
          "404": { "description": "Order not found" }
        }
      }
    },
    "/orders/{id}/feedback/snooze": {
      "post": {
        "tags": ["Feedback & Reviews"],
        "summary": "Snooze feedback prompt for 1 hour",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Feedback reminder snoozed" }
        }
      }
    },
    "/orders/{id}/feedback/opt-out": {
      "post": {
        "tags": ["Feedback & Reviews"],
        "summary": "Permanently opt-out of feedback for order",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Opted out of feedback" }
        }
      }
    },
    "/agent/register": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Register a new delivery agent and send email verification token",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/AgentRegistrationDTO" }
            }
          }
        },
        "responses": {
          "201": { "description": "Agent registered; verification email dispatched" },
          "400": { "description": "Missing required fields or email already exists" }
        }
      }
    },
    "/agent/verify-email": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Verify agent email token and issue temporary login password via email",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/AgentVerifyEmailDTO" }
            }
          }
        },
        "responses": {
          "200": { "description": "Email verified; temporary password sent to inbox" },
          "400": { "description": "Invalid or expired verification token" }
        }
      }
    },
    "/agent/login": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Authenticate delivery agent with email and password",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/AgentLoginDTO" }
            }
          }
        },
        "responses": {
          "200": { "description": "Authentication successful; returns JWT token and agent profile" },
          "401": { "description": "Invalid credentials or email unverified" }
        }
      }
    },
    "/agent/forgot-password": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Request delivery agent password reset verification OTP",
        "description": "Generates a 6-digit verification OTP and reset link, dispatched via email to the registered delivery agent.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email"],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "agent.alex@shopsphere.test"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Password reset OTP dispatched to registered agent email" },
          "400": { "description": "Missing or invalid email" },
          "404": { "description": "Agent account not found" }
        }
      }
    },
    "/agent/reset-password": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Verify OTP and reset delivery agent password",
        "description": "Validates the 6-digit OTP code or reset token sent to the delivery agent, hashes new password with bcrypt, updates PostgreSQL delivery_agents table, and clears mandatory password rotation flag.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email", "newPassword"],
                "properties": {
                  "email": { "type": "string", "format": "email", "example": "agent.alex@shopsphere.test" },
                  "otp": { "type": "string", "example": "123456" },
                  "token": { "type": "string", "example": "abc123token" },
                  "newPassword": { "type": "string", "minLength": 6, "example": "AlexRivers@2026" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Agent password reset successfully in PostgreSQL" },
          "400": { "description": "Invalid OTP, expired code, or password too short" }
        }
      }
    },
    "/agent/profile/password": {
      "patch": {
        "tags": ["Delivery Agents"],
        "summary": "Change delivery agent password (mandatory on first login)",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/AgentChangePasswordDTO" }
            }
          }
        },
        "responses": {
          "200": { "description": "Password updated successfully" },
          "400": { "description": "Password validation error" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/agent/me": {
      "get": {
        "tags": ["Delivery Agents"],
        "summary": "Get authenticated delivery agent profile and earnings",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Current agent profile" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/agent/profile": {
      "put": {
        "tags": ["Delivery Agents"],
        "summary": "Update agent details (name, phone, vehicle, delivery zone, gender, avatarUrl)",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Profile updated" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/agent/profile/avatar": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Upload custom avatar image for delivery agent (JPG/PNG, up to 5MB Base64)",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/AvatarUploadDTO" }
            }
          }
        },
        "responses": {
          "200": { "description": "Avatar updated" },
          "400": { "description": "Invalid image format or size exceeds 5MB" }
        }
      }
    },
    "/agent/orders": {
      "get": {
        "tags": ["Delivery Agents"],
        "summary": "List assigned delivery orders for the authenticated agent",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of assigned orders" },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/agent/orders/{id}/verify-otp": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Validate customer 6-digit delivery OTP before completing delivery or collecting payment",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/VerifyDeliveryOtpDTO" }
            }
          }
        },
        "responses": {
          "200": { "description": "OTP verified successfully" },
          "400": { "description": "Invalid or expired OTP" }
        }
      }
    },
    "/agent/orders/{id}/collect-payment": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Collect Cash or UPI payment, mark order DELIVERED, and credit agent commission wallet",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CollectPaymentDTO" }
            }
          }
        },
        "responses": {
          "200": { "description": "Payment collected, order delivered, agent wallet credited" },
          "400": { "description": "OTP verification required before payment collection" }
        }
      }
    },
    "/agent/earnings": {
      "get": {
        "tags": ["Delivery Agents"],
        "summary": "Retrieve earnings summary, completed deliveries count, and commission balance",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Earnings and delivery statistics" }
        }
      }
    },
    "/agent/logout": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Logout delivery agent and remove from active FIFO rotation queue",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Agent logged out successfully" }
        }
      }
    },
    "/agent/heartbeat": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Send agent heartbeat with real-time GPS coordinates to maintain online presence",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "currentLat": { "type": "number", "example": 17.4486 },
                  "currentLng": { "type": "number", "example": 78.3908 }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Heartbeat acknowledged" }
        }
      }
    },
    "/agent/orders/{id}/accept": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Accept assigned order within 3-minute window (moves order to OUT_FOR_DELIVERY & dispatches OTP)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Order accepted and moved to OUT_FOR_DELIVERY" },
          "400": { "description": "Acceptance window expired or order unavailable" }
        }
      }
    },
    "/agent/orders/{id}/reject": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Reject assigned order (immediately reassigns to next available FIFO agent)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Order rejected and rotated in FIFO queue" }
        }
      }
    },
    "/agent/orders/{id}/complete-delivery": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Mark prepaid order DELIVERED following OTP verification and credit agent commission",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Delivery completed and commission credited" },
          "400": { "description": "OTP verification required prior to completion" }
        }
      }
    },
    "/agent/orders/{id}/cod-qr-submitted": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Submit UPI QR payment proof (sets order to DELIVERED and QR_PAID_AWAITING_ADMIN)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "UPI QR payment submitted for Admin verification" }
        }
      }
    },
    "/agent/orders/{id}/cod-cash-collected": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Record physical cash collection and lock agent account until deposited at store",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Cash recorded; agent account locked for store deposit" }
        }
      }
    },
    "/agent/orders/{id}/mark-cash-deposited": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "Agent marks collected cash deposited at the Hyderabad flagship store",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Cash marked deposited; awaiting Admin confirmation" }
        }
      }
    },
    "/admin/orders/{id}/confirm-qr-payment": {
      "patch": {
        "tags": ["Delivery Agents", "Admin - Orders"],
        "summary": "[Requires Admin JWT] Confirm customer UPI QR payment received",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "QR payment confirmed and settled" }
        }
      }
    },
    "/admin/orders/{id}/request-cash-deposit": {
      "patch": {
        "tags": ["Delivery Agents", "Admin - Orders"],
        "summary": "[Requires Admin JWT] Request physical cash deposit from delivery agent",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Cash deposit requested at store" }
        }
      }
    },
    "/admin/orders/{id}/confirm-cash-deposited": {
      "patch": {
        "tags": ["Delivery Agents", "Admin - Orders"],
        "summary": "[Requires Admin JWT] Confirm cash received at store and UNLOCK delivery agent",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Cash verified and agent account unlocked" }
        }
      }
    },
    "/admin/agents": {
      "get": {
        "tags": ["Delivery Agents"],
        "summary": "[Requires Admin JWT] List all registered delivery agents with metrics",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "List of all delivery agents" }
        }
      },
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "[Requires Admin JWT] Create and activate a new delivery agent",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/AgentRegistrationDTO" }
            }
          }
        },
        "responses": {
          "201": { "description": "Delivery agent created" }
        }
      }
    },
    "/admin/agents/{id}": {
      "patch": {
        "tags": ["Delivery Agents"],
        "summary": "[Requires Admin JWT] Update agent status (active/inactive) or commission rate",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Agent updated" }
        }
      }
    },
    "/admin/orders/{id}/assign-agent": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "[Requires Admin JWT] Reassign delivery order to a specific agent",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["agentId"],
                "properties": {
                  "agentId": { "type": "string", "example": "agt_9x8k1" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Agent assigned to order" }
        }
      }
    },
    "/admin/notifications": {
      "get": {
        "tags": ["Notifications & Amount Handling"],
        "summary": "[Requires Admin JWT] List persistent in-app notifications and alerts for Store Admin",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Admin notifications list and unread count" }
        }
      }
    },
    "/admin/notifications/{id}/read": {
      "patch": {
        "tags": ["Notifications & Amount Handling"],
        "summary": "[Requires Admin JWT] Mark specific Admin notification as read",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Notification marked read" }
        }
      }
    },
    "/admin/notifications/mark-all-read": {
      "patch": {
        "tags": ["Notifications & Amount Handling"],
        "summary": "[Requires Admin JWT] Mark all Admin notifications as read",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "All notifications marked read" }
        }
      }
    },
    "/admin/amount-handling": {
      "get": {
        "tags": ["Notifications & Amount Handling"],
        "summary": "[Requires Admin JWT] Retrieve Amount Collection & Cash Handling dashboard KPI summary, pending UPI QR orders, and cash deposit agents",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Amount handling summary and queues" }
        }
      }
    },
    "/admin/agents/{agentId}/approve-cash-deposit": {
      "post": {
        "tags": ["Notifications & Amount Handling"],
        "summary": "[Requires Admin JWT] Approve physical store cash deposit for delivery agent, reset held cash, and unlock into active FIFO queue",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "agentId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Cash deposit approved and delivery agent unlocked into active queue" },
          "400": { "description": "Agent has no pending cash deposit" }
        }
      }
    },
    "/admin/agents/{agentId}/reject-cash-deposit": {
      "post": {
        "tags": ["Notifications & Amount Handling"],
        "summary": "[Requires Admin JWT] Reject delivery agent's store cash deposit with reason, keep agent locked, and send real-time in-app notification",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "agentId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "reason": { "type": "string", "example": "Cash short by ₹200 at store counter" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Deposit rejected and agent notified to resubmit" }
        }
      }
    },
    "/agent/cash-deposit/submit": {
      "post": {
        "tags": ["Delivery Agents"],
        "summary": "[Requires Agent JWT] Delivery Agent submits confirmation that physical cash was deposited at Hyderabad store counter",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Deposit submitted for Admin verification" },
          "400": { "description": "No pending cash deposit required" }
        }
      }
    },
    "/agent/notifications": {
      "get": {
        "tags": ["Delivery Agents"],
        "summary": "[Requires Agent JWT] List in-app alerts and notifications for the authenticated delivery agent",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "Agent notifications and unread count" }
        }
      }
    },
    "/agent/notifications/{id}/read": {
      "patch": {
        "tags": ["Delivery Agents"],
        "summary": "[Requires Agent JWT] Mark specific agent notification as read",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Notification marked read" }
        }
      }
    },
    "/agent/notifications/mark-all-read": {
      "patch": {
        "tags": ["Delivery Agents"],
        "summary": "[Requires Agent JWT] Mark all agent notifications as read",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "All notifications marked read" }
        }
      }
    }
  }
};
