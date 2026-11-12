# ShopSphere — Enterprise Multi-Category E-Commerce & QA Automation Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0_Swagger-85EA2D?logo=swagger&logoColor=black)](http://localhost:3000/api-docs)
[![Netlify](https://img.shields.io/badge/Netlify-Serverless_Ready-00C7B7?logo=netlify&logoColor=white)](https://www.netlify.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**ShopSphere** is a modern, production-grade multi-category e-commerce web platform engineered for real-world online shopping experiences and comprehensive **QA Automation Testing** (Playwright, Cypress, Selenium, Postman/Newman, and REST-Assured).

It features a customer-facing storefront built with **React 19**, **Tailwind CSS**, and **Vite**, accompanied by a dedicated, standalone **OpenAPI 3.0 Swagger UI** for backend API test automation and a **Graphviz DOT workflow state machine**.

---

## 📑 Table of Contents
1. [Core Features](#-core-features)
2. [Multi-Category Catalog Domains](#-multi-category-catalog-domains)
3. [Pre-Seeded QA Test Accounts](#-pre-seeded-qa-test-accounts)
4. [Dedicated Swagger UI & Backend API Testing](#-dedicated-swagger-ui--backend-api-testing)
5. [REST API Endpoints Reference](#-rest-api-endpoints-reference)
6. [Local Quick Start](#-local-quick-start)
7. [Deployment Guide (Netlify & Serverless)](#-deployment-guide-netlify--serverless)
8. [Automated QA Testing Scenarios](#-automated-qa-testing-scenarios)
9. [Project Architecture](#-project-architecture)

---

## 🌟 Core Features

### 🛍️ Real Consumer E-Commerce Storefront
- **Modern Commercial Header**: Top promotional announcement banner, currency selector (`USD $`, `EUR €`, `GBP £`), customer hotline, and quick demo login switchers.
- **Live Autocomplete Search**: Real-time dropdown search preview showing product thumbnails, categories, matching titles, and prices.
- **Interactive Hero Showcase**: Multi-slide dynamic carousel highlighting flagship smartphones, haute couture apparel, and studio audio gear.
- **Flash Deals with Live Countdown**: Ticking countdown timer (`HH:MM:SS`) displaying limited-time discounts with percentage savings badges.
- **Trust Value Guarantees**: Free worldwide shipping threshold ($50), 30-day easy returns, 2-year official warranty, and 256-bit SSL secured checkout.
- **Full Wishlist System**: Toggle favorites on any product card or detail modal, stored persistently in `localStorage`, accessible via a slide-over Wishlist drawer with 1-click *"Move to Cart"*.
- **Enhanced Product Catalog**:
  - Filter by Category, Price Range slider, and "In Stock Only" toggle.
  - Sorting by Featured, Price (Low to High / High to Low), and Highest Rated.
  - Layout toggle: Standard 4-column vs. Compact 3-column grid.
  - Hover zoom with secondary product image preview, color swatches, and stock urgency badges (`Only 3 left!`).
- **Product Detail Modal (PDP) with Reviews Engine**:
  - Multi-image gallery with thumbnail selection.
  - Size selectors (`XS`, `S`, `M`, `L`, `XL`), color swatches with hex codes, hardware storage variants, and perfume olfactory pyramids.
  - **Customer Reviews & Ratings**: View verified customer reviews and submit new star-rated reviews with real-time score calculation.
- **Slide-Out Cart Drawer**:
  - Free shipping progress bar (unlocks at $50).
  - Multi-coupon support (`SPHERE20` for 20% off, `SUMMER50` for 50% off, `WELCOME10` for 10% off, `FREESHIP` for free shipping).
  - Clickable coupon suggestion chip for instant 1-click discounts.
  - Real-time subtotal, discount, tax, shipping, and grand total calculations.
- **Multi-Step Checkout**:
  - Address collection with form validation.
  - Shipping method selection (Standard Free, Express $9.99, Priority $19.99).
  - Payment method options (Credit/Debit Card, UPI QR, Net Banking, Cash on Delivery).
  - 2FA OTP verification gate (`123456`).
  - Order confirmation screen with tracking ID and itemized receipt.
- **Orders & Invoice Tracking**: Real-time delivery timeline stages (*Placed* $\rightarrow$ *Processing* $\rightarrow$ *In Transit* $\rightarrow$ *Delivered*), invoice preview, and past order history.
- **VIP Newsletter & FAQ**: Email subscription with instant promo code reward and interactive customer service FAQ accordion.

---

## 📦 Multi-Category Catalog Domains

ShopSphere features a rich catalog populated with realistic product attributes, specifications, variant matrices, and fragrance pyramids:

| Category | Subcategory | Example Products & Specifications |
| :--- | :--- | :--- |
| **Electronics** | Smartphones & Tech | • **Apex Ultra Pro 5G**: Snapdragon 8 Gen 3, 2K 120Hz LTPO AMOLED, 200MP Leica optics, 100W GaN charging, storage variants (256GB / 512GB / 1TB).<br>• **Nova Fold Z Foldable**: 7.9-inch Foldable Dynamic AMOLED 2X, Titanium Hinge.<br>• **Titan Matrix One**: 165Hz Gaming OLED, Active Liquid Cooling Chamber. |
| **Fashion** | Dresses & Apparel | • **Silk Evening Flared Wrap Dress**: Pure mulberry silk, sizing `XS`-`XL`, color swatches (*Emerald Green*, *Midnight Navy*, *Champagne Rose*).<br>• **Bohemian Floral Chiffon Maxi**: Tiered breathable summer silhouette.<br>• **Italian Wool Double-Breasted Blazer Dress**: Structured sartorial tailoring. |
| **Audio** | Bluetooth & Headphones | • **SonicWave Pro ANC Earbuds**: 48dB adaptive active noise cancellation, coaxial dual drivers, LDAC 990kbps Hi-Res audio, 42hr battery.<br>• **BassForge Studio Wireless**: 50mm dynamic drivers, studio reference acoustics.<br>• **PulseBeat X500 Speaker**: IP67 rugged floating waterproof construction. |
| **Beauty** | Perfumes & Scents | • **Oud Noir Royal Eau de Parfum**: Top notes (Cardamom, Bergamot), Heart notes (Cambodian Oud, Rose Centifolia), Base notes (Smoked Amber, Sandalwood).<br>• **Velvet Rose & Smoked Amber Elixir**<br>• **Citrus Breeze & French Neroli Extrait** |

---

## 👥 Pre-Seeded QA Test Accounts

The platform comes pre-configured with deterministic seed credentials for automated tests and manual exploration:

| Role | Name | Email | Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | Sampath Kumar (Admin) | `admin@practicesoftwaretesting.com` | `welcome01` | Full RBAC Admin, inventory create/update/delete, global orders view |
| **Customer 1** | Jane Customer (User 1) | `customer@practicesoftwaretesting.com` | `User01` | Customer purchases, checkout, reviews, order history |
| **Customer 2** | Alex Rivera (User 2) | `customer2@practicesoftwaretesting.com` | `User02` | Customer purchases, checkout, reviews, order history |

> **Tip**: In the storefront header, use the **"Demo Logins"** dropdown for 1-click authentication without manually typing credentials.

---

## 📑 Dedicated Swagger UI & Backend API Testing

To ensure testing isolation, the OpenAPI Swagger Explorer is served **completely independently** from the consumer shopping UI:

- **Swagger UI Console:** **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)** *(also accessible via `/docs` or `/swagger`)*
- **Raw OpenAPI 3.0 Specification:** `http://localhost:3000/api/swagger.json`
- **Graphviz DOT Workflow Flowchart:** `http://localhost:3000/api/dot-flow`

### Key Swagger Features for QA Engineers:
1. **Interactive "Try it out" Mode**: Send live HTTP requests directly with custom parameters, query strings, and payloads.
2. **Bearer JWT Authorization**: Click the `Authorize` padlock icon in Swagger to supply a JWT token obtained from `/api/users/login` and test protected endpoints.
3. **Automated cURL Generation**: One-click copy of standard terminal `curl` commands for every endpoint.
4. **Complete Schema Models**: Inspect detailed JSON validation schemas for Users, Products, Variants, Carts, Orders, and Reviews.

---

## 📡 REST API Endpoints Reference

### 1. Authentication & Users (JWT Token-Based, 24-Hour Expiration)
- `POST /api/users/register` — Create new customer account. Returns HTTP `201 Created` with a **24-hour JWT Bearer token** and profile.
- `POST /api/users/login` — Authenticate credentials. Returns HTTP `200 OK` with a **24-hour JWT Bearer token** and profile.
- `POST /api/users/oauth` — OAuth 2.0 social login & registration for **Google** and **Apple**. Returns HTTP `200 OK` with a **24-hour JWT Bearer token** and profile.
- `GET /api/users/me` — Retrieve current authenticated profile (Requires `Authorization: Bearer <token>`).
- `GET /api/users` — User management directory (Admin only).

### 2. Catalog & Products
- `GET /api/products` — Retrieve paginated products with filtering:
  - `category` (e.g. `electronics`, `fashion`, `audio`, `beauty`)
  - `search` (text search across title, description, and specs)
  - `minPrice` & `maxPrice`
  - `sort` (`newest`, `low-to-high`, `high-to-low`, `rating`)
  - `page` & `limit`
- `GET /api/products/:id` — Single product details view (PDP) with specifications and variants.
- `GET /api/products/:id/reviews` — Fetch customer reviews for a product.
- `POST /api/products/:id/reviews` — Submit a customer review (`userName`, `rating` [1-5], `comment`).
- `POST /api/products` — Create a new product (Admin only).
- `PUT /api/products/:id` — Update product details (Admin only).
- `DELETE /api/products/:id` — Delete product (Admin only).

### 3. Cart & Basket Management
- `POST /api/carts` — Initialize a unique basket session ID. Returns HTTP `201 Created`.
- `GET /api/carts/:basketId` — Retrieve basket items, total item count, tax, and shipping fee calculations.
- `POST /api/carts/:basketId` — Add or increment an item in the cart (`productId`, `quantity`, `selectedVariant`, `selectedColor`, `selectedSize`).
- `DELETE /api/carts/:basketId` — Remove specific item (`?productId=...`) or empty the entire basket. Returns HTTP `204 No Content`.

### 4. Orders & Checkout
- `POST /api/orders/verify-otp` — Verify simulated 2FA OTP code (`123456`). Returns HTTP `200 OK`.
- `POST /api/orders` — Finalize order, decrement catalog inventory, and generate tracking ID. Returns HTTP `201 Created`.
- `GET /api/orders` — Retrieve user order history or all orders (if Admin).

### 5. QA Automation Utilities
- `POST /api/seed/reset` — **Database Reset Hook**: Resets the entire database store back to pristine initial seed state. Run this before or after test suites for 100% repeatable tests.
- `GET /api/health` — Application health check endpoint.

---

## 🚀 Local Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ or 20+ recommended)
- `npm` (included with Node.js)

### Installation & Execution

```bash
# 1. Clone the repository
git clone https://github.com/SampathKumarVeesam/MyEcommers-for-QaAutomation.git
cd MyEcommers-for-QaAutomation

# 2. Install dependencies
npm install

# 3. Start development server (Frontend + Backend)
npm run dev

# 4. Open in browser:
# Storefront: http://localhost:3000
# Swagger UI: http://localhost:3000/api-docs
```

### Available NPM Scripts
- `npm run dev` — Starts the full-stack server (Vite + Express).
- `npm run build` — Compiles the production frontend bundle into `dist/`.
- `npm run lint` — Runs TypeScript type-checking without emitting files (`tsc --noEmit`).
- `npm start` — Runs the production Node.js server.

---

## ☁️ Deployment Guide (Netlify & Serverless)

This repository includes native configuration files for **Netlify**:
- `netlify.toml` — Build settings and routing rules.
- `netlify/functions/api.ts` — Serverless Express handler powered by `serverless-http`.

### Deploying to Netlify in 3 Steps:
1. Push this repository to GitHub.
2. In the [Netlify Dashboard](https://app.netlify.com/), click **"Add new site" > "Import an existing project"** and select this repository.
3. Netlify will auto-detect `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
4. Click **"Deploy Site"**.

---

## 🧪 Automated QA Testing Scenarios

This application is designed specifically as an end-to-end benchmark for test automation frameworks:

### Common Automated Test Flows:
1. **Pristine Seed Reset**:
   - `POST /api/seed/reset` to ensure clean initial conditions.
2. **User Authentication Flow**:
   - Register new user $\rightarrow$ verify response code `201` $\rightarrow$ login with credentials $\rightarrow$ assert JWT token format $\rightarrow$ fetch `/api/users/me` with Bearer auth.
3. **Catalog Filtering & Sorting**:
   - Query category `electronics` $\rightarrow$ verify all returned items belong to electronics $\rightarrow$ filter by `maxPrice=500` $\rightarrow$ assert prices $\leq 500$.
4. **Cart Lifecycle**:
   - `POST /api/carts` to acquire `basketId` $\rightarrow$ add 2 items $\rightarrow$ assert total item count equals 2 $\rightarrow$ update item quantity $\rightarrow$ verify subtotal recalculation $\rightarrow$ remove 1 item $\rightarrow$ assert updated count.
5. **Coupons & Discount Logic**:
   - Apply coupon `SPHERE20` $\rightarrow$ assert 20% discount applied to subtotal $\rightarrow$ verify free shipping threshold behavior.
6. **E2E Order Checkout & Tracking**:
   - Complete address form $\rightarrow$ select delivery method $\rightarrow$ verify 2FA OTP `123456` $\rightarrow$ submit order $\rightarrow$ verify stock decrement in catalog $\rightarrow$ inspect order history for generated tracking number.

---

## 🏗️ Project Architecture

```
MyEcommers-for-QaAutomation/
├── netlify/
│   └── functions/
│       └── api.ts                 # Serverless Express wrapper for Netlify
├── server/
│   ├── middleware/
│   │   └── auth.ts                # JWT authentication & admin authorization middleware
│   ├── routes/
│   │   ├── auth.ts                # User registration, login, and profile routes
│   │   ├── carts.ts               # Basket creation, items add/update/delete
│   │   ├── orders.ts              # Order placement, OTP verification, order tracking
│   │   └── products.ts            # Product catalog, filtering, and reviews endpoints
│   ├── app.ts                     # Shared Express application setup & middleware
│   ├── dbStore.ts                 # In-memory relational database store with seed data
│   ├── seedData.ts                # Verified seed products, categories, and user accounts
│   └── swaggerDoc.ts              # OpenAPI 3.0 specification & Graphviz DOT workflow
├── src/
│   ├── components/
│   │   ├── AdminPanelModal.tsx    # Admin inventory & product creation dashboard
│   │   ├── AuthModal.tsx          # Login & registration modal
│   │   ├── CartDrawer.tsx         # Slide-over cart drawer with coupons & shipping tracker
│   │   ├── CheckoutModal.tsx      # Multi-step checkout with address, payment & OTP
│   │   ├── Header.tsx             # Navbar with live search, wishlist, currency & cart
│   │   ├── HeroBanner.tsx         # Interactive promotional carousel & flash deals timer
│   │   ├── NewsletterSection.tsx  # VIP subscription box & customer FAQ accordion
│   │   ├── OrdersModal.tsx        # Order history, delivery timeline & invoices
│   │   ├── ProductCard.tsx        # Product card with wishlist heart, badges & quick-add
│   │   ├── ProductDetailModal.tsx # Full PDP view with sizing, variants & customer reviews
│   │   └── WishlistModal.tsx      # Slide-over wishlist manager with move-to-cart
│   ├── context/
│   │   ├── AuthContext.tsx        # Authentication & JWT session context
│   │   ├── CartContext.tsx        # Shopping basket state & sync with backend API
│   │   └── WishlistContext.tsx    # LocalStorage persistent wishlist context
│   ├── App.tsx                    # Main storefront catalog application
│   ├── main.tsx                   # React 19 root entrypoint
│   ├── types.ts                   # Core TypeScript domain models & interfaces
│   └── index.css                  # Tailwind CSS design system styles
├── netlify.toml                   # Netlify serverless deployment configuration
├── package.json                   # Project dependencies and npm scripts
├── server.ts                      # Full-stack Node.js development server entrypoint
├── tsconfig.json                  # TypeScript compiler configuration
└── vite.config.ts                 # Vite bundler & React plugin configuration
```

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
