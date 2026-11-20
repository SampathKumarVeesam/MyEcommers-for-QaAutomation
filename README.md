# ShopSphere v2.7.0 — Enterprise Multi-Category E-Commerce & QA Automation Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.0-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9_Live_Map-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0_Swagger-85EA2D?logo=swagger&logoColor=black)](http://localhost:3000/api-docs)
[![Netlify](https://img.shields.io/badge/Netlify-Serverless_Ready-00C7B7?logo=netlify&logoColor=white)](https://www.netlify.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**ShopSphere** is a modern, production-grade multi-category e-commerce web platform engineered for real-world online shopping experiences and comprehensive **QA Automation Testing** (Playwright, Cypress, Selenium, Postman/Newman, and REST-Assured).

It features a customer-facing storefront built with **React 19**, **Tailwind CSS**, and **Vite**, a complete **Delivery Agent Logistics & Onboarding Portal**, **Interactive Leaflet Live Map Tracking**, **FIFO Auto-Assignment & Acceptance Rotation**, **Privacy-Masked Logistics Views**, **Universal OTP Gates**, **Cash Store-Deposit Settlement Lockout**, **Admin Amount Collection & Cash Handling Dashboard**, **Real-Time In-App Notifications**, a **PostgreSQL 18** transactional persistence layer, automated transactional email dispatch via **Brevo HTTPS REST API (port 443)** with Zoho SMTP fallback, an interactive **OpenAPI 3.0 Swagger UI**, and a **Graphviz DOT workflow state machine**.

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
- **Orders & Invoice Tracking**: Real-time delivery timeline stages (*Processing* $\rightarrow$ *Processed* $\rightarrow$ *Out for Delivery* $\rightarrow$ *Delivered*, or *Cancelled* status banner), itemized invoices, and past order history.
- **Cash on Delivery (COD) & Delivery OTP Flow**:
  - Customer's *"Pay to Delivery Boy"* action is locked during `PROCESSING` and `PROCESSED`, activating **only** when the order status reaches `OUT_FOR_DELIVERY`.
  - When dispatched, an automated **6-digit secure Delivery OTP** is generated, stored in PostgreSQL, and emailed to the customer.
  - The delivery agent must verify this OTP to complete delivery and collect payment via Cash or dynamic UPI QR code.
- **Dedicated Delivery Agent Portal (`/delivery` or `#/agent`)**:
  - Independent delivery partner portal styled to match the ShopSphere design system.
  - **Email-Verified Onboarding & Mailbox OTP**: Agent self-registration with gender-matched avatar selection. A 6-digit verification code is dispatched strictly to the agent's mailbox (never auto-filled in the UI), requiring manual entry. Upon OTP verification, a secure random temporary login password is generated on the server and dispatched directly to the agent's email address (never exposed in the UI or client API response).
  - **Mandatory First-Login Password Change**: Secure password rotation enforced upon first login with the emailed temporary password before dashboard access is granted.
  - **Dedicated Store Cash Deposit Dashboard**: Real-time lock banner displaying held cash amount, Admin rejection notes, and 1-click "Mark Cash Deposited at Store" / "Re-submit Store Deposit" action workflow.
  - **Assigned Deliveries Queue & Commission Wallet**: Live order assignments with customer address, contact info, OTP validation gate, Cash/UPI payment settlement, and automatic commission wallet crediting (₹150 per completed delivery).
- **Unified Profile & Avatar Customization**:
  - Available for both Customers and Delivery Agents via the user menu.
  - Gender selector (`male`, `female`, `non-binary`, `prefer_not_to_say`) dynamically loading 6 matching preset avatars.
  - Custom file upload for `.jpg` and `.png` (up to 5MB) converted to Base64 data URIs and stored in PostgreSQL `avatar_url` column for persistent cloud hosting resilience.
- **Hyderabad Logistics Dispatch Hub & Indian Localization (+91 🇮🇳)**:
  - **Flagship Dispatch Origin**: Mindspace Madhapur / Hitech City, Hyderabad, Telangana 500081 (`17.4486, 78.3908`).
  - **Authentic Indian Addressing & Validation**: Localized PIN codes (`500xxx`), 10-digit phone verification (`+91 98765 43210`), and INR (`₹`) currency across all customer, agent, and admin interfaces.
- **Interactive Leaflet Live Order Route Map**:
  - OpenStreetMap & Leaflet interactive map rendered across Customer Order Tracking, Delivery Agent Dashboard, and Admin Logistics console.
  - Features Hyderabad Flagship Store origin pin, customer destination marker, polyline route, and animated delivery partner courier marker.
- **Active Agent FIFO Queue & 3-Minute Acceptance Rotation**:
  - Online presence tracking (`is_logged_in`, 60-second heartbeat ping, 15-minute active window).
  - When an order transitions to `PROCESSED`, the backend FIFO auto-dispatcher sequentially assigns the order to the highest-ranking active, unlocked agent.
  - 3-minute accept/reject timer window: If the agent rejects or does not accept within 3 minutes, the order automatically rotates to the next available FIFO agent.
- **Privacy-Masked Delivery Logistics View**:
  - Safeguards customer privacy by masking product titles, descriptions, and images in the Agent view, exposing only SKU Product IDs (`#104`), quantities, and order totals.
- **Universal OTP Delivery Gate**:
  - When an order transitions to `OUT_FOR_DELIVERY`, a secure 6-digit Delivery OTP is generated, persisted in PostgreSQL, and synchronized across customer email and the Customer Order Tracking view.
  - Delivery agents must input and verify this 6-digit OTP before completing delivery for **both Prepaid and Cash on Delivery (COD)** orders.
- **COD Settlement Workflows, Store Cash-Deposit Lockout & Re-Submit Loop**:
  - **Option 1 (Dynamic UPI QR)**: Generates dynamic UPI QR code (`upi://pay?pa=shop.sphere@upi&...`); agent submits payment (`QR_PAID_AWAITING_ADMIN`), and store admin confirms receipt (`QR_AMOUNT_RECEIVED`).
  - **Option 2 (Physical Cash Lockout & Verification)**: Agent records cash collection (`CASH_COLLECTED_BY_AGENT`); agent account enters a **LOCKED** state, pausing new FIFO assignments until cash is deposited at the Hyderabad Flagship Store (`DEPOSIT_SUBMITTED_FOR_APPROVAL`).
  - **Store Admin Approve / Reject Workflow**: Store Admin verifies physical cash at the counter and clicks *"Approve Deposit"* to clear the agent's balance and instantly unlock them into the active FIFO queue. If rejected, Admin enters a rejection reason, keeping the agent locked with an alert prompting re-submission.
- **Admin Amount Collection & Cash Handling Console**:
  - Dedicated financial dashboard featuring 3 KPI cards (Total UPI QR Confirmed vs. Awaiting Verification, Physical Cash in Hand vs. Approved, and Grand Total Reconciled COD Revenue).
  - UPI QR Verification Queue for confirming customer UPI payments.
  - Store Cash Deposit Approval Queue with linked order breakdowns and 1-click Approve / Reject actions.
- **Real-Time In-App Notifications**:
  - Persistent alert bells in both Store Admin and Delivery Agent portals backed by PostgreSQL `notifications` table, featuring real-time polling (every 6 seconds) for instant order alerts and deposit status updates without page refresh.
- **Automated Post-Delivery Feedback Reminder**:
  - Non-intrusive popup appearing 15 minutes after order delivery prompting customers for a 5-star rating and written review.
  - Features an interactive star rating selector, *"Remind Me Later (1h)"* snooze, and a permanent *"No thanks"* opt-out button.
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
| **Administrator** | Sampath Kumar (Admin) | `admin@practicesoftwaretesting.com` | `welcome01` | Full RBAC Admin, inventory create/update/delete, agent oversight, global orders view |
| **Delivery Agent** | Alex Rivers (Agent) | `agent.alex@shopsphere.test` | `Agent#2026!` | Dedicated delivery portal, assigned orders queue, OTP verification, Cash/UPI settlement, earnings |
| **Customer 1** | Jane Customer (User 1) | `customer@practicesoftwaretesting.com` | `User01` | Customer purchases, checkout, reviews, order history, profile customization |
| **Customer 2** | Alex Rivera (User 2) | `customer2@practicesoftwaretesting.com` | `User02` | Customer purchases, checkout, reviews, order history, profile customization |

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
- `PUT /api/users/profile` — Update user profile details (name, gender, avatarUrl).
- `POST /api/users/profile/avatar` — Upload custom avatar image (JPG/PNG, up to 5MB encoded as Base64 data URI).
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
- `PATCH /api/orders/:id/paid-to-delivery-boy` — Customer marks COD order as paid to delivery boy (enabled only when `OUT_FOR_DELIVERY`).
- `GET /api/orders/pending-feedback` — Retrieve delivered orders pending customer feedback.
- `POST /api/orders/:id/feedback` — Submit 5-star rating and review for delivered order.
- `POST /api/orders/:id/feedback/snooze` — Snooze feedback reminder prompt for 1 hour.
- `POST /api/orders/:id/feedback/opt-out` — Permanently opt out of review prompt for order.

### 5. Delivery Agent Logistics Portal (`/api/agent/*`)
- `POST /api/agent/register` — Onboard new delivery agent and send email verification token.
- `POST /api/agent/verify-email` — Verify email token and dispatch temporary password to inbox.
- `POST /api/agent/login` — Authenticate agent credentials; returns JWT and onboarding flags.
- `PATCH /api/agent/profile/password` — Mandatory password update on first login.
- `GET /api/agent/me` — Retrieve authenticated agent profile and earnings balance.
- `PUT /api/agent/profile` — Update agent personal and delivery vehicle settings.
- `POST /api/agent/profile/avatar` — Upload custom agent avatar image (JPG/PNG, up to 5MB Base64).
- `GET /api/agent/orders` — List live delivery tasks assigned to the authenticated agent.
- `POST /api/agent/orders/:id/verify-otp` — Validate customer 6-digit delivery OTP.
- `POST /api/agent/orders/:id/collect-payment` — Settle Cash or UPI payment, mark order DELIVERED, and credit agent wallet ($15).
- `GET /api/agent/earnings` — Retrieve total deliveries and commission balance summary.

### 6. Admin Delivery Management (`/api/admin/agents*`)
- `GET /api/admin/agents` — List all registered delivery agents with metrics and active status.
- `POST /api/admin/agents` — Create and activate a new delivery agent.
- `PATCH /api/admin/agents/:id` — Update agent status (`active` / `inactive`) or commission rate.
- `POST /api/admin/orders/:id/assign-agent` — Assign or reassign order to a specific delivery agent.

### 7. QA Automation Utilities
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

## ✉️ Transactional Email Architecture (Brevo HTTPS REST API)

ShopSphere includes an automated transactional email notification pipeline triggered on key customer and order lifecycle events:

- **Welcome Email**: Sent automatically upon customer registration with account highlights.
- **Order Confirmation**: Itemized purchase receipt with subtotal, tax, shipping, and tracking reference.
- **Order Status Updates**: Real-time delivery progress updates (`PROCESSING`, `PROCESSED`, `OUT_FOR_DELIVERY`, `DELIVERED`, and `CANCELLED`).
- **Cash on Delivery (COD)**: Payment instruction on dispatch and administrative alert when customer marks *"Paid to Delivery Boy"*.

### Cloud-Native Delivery via Brevo (Port 443 HTTPS):
Cloud hosting providers (such as Render's free tier) restrict outbound SMTP ports (25, 465, 587). To guarantee 100% deliverability on cloud deployments, ShopSphere transmits transactional emails over secure HTTPS via the **Brevo (Sendinblue) REST API** (`POST https://api.brevo.com/v3/smtp/email`):

| Environment Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `BREVO_API_KEY` | Brevo API v3 Key (activates HTTPS delivery on Port 443) | `<your_brevo_api_key>` |
| `EMAIL_FROM` | Verified sender email address | `sampathkumarveesam@zohomail.in` |
| `SMTP_HOST` | *(Local fallback)* SMTP server host | `smtp.zoho.in` |
| `SMTP_PORT` | *(Local fallback)* SMTP server port | `465` (SSL) or `587` (TLS) |
| `SMTP_USER` | *(Local fallback)* SMTP login user | `your_email@zohomail.in` |
| `SMTP_PASS` | *(Local fallback)* SMTP application password | `<smtp_password>` |

> **Architecture Note**: When `BREVO_API_KEY` is present in the environment, all transactional emails are dispatched over HTTPS (Port 443) via Brevo. If `BREVO_API_KEY` is omitted, the mailer gracefully falls back to Zoho Mail SMTP for offline/local dev.

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
│   ├── db/
│   │   ├── pool.ts                # PostgreSQL connection pool with SSL/Render support
│   │   └── schema.sql             # PostgreSQL 18 table DDL definitions & indexes
│   ├── middleware/
│   │   └── auth.ts                # JWT auth (Customer, Administrator & Delivery Agent)
│   ├── repositories/
│   │   ├── agentRepo.ts           # Delivery agent CRUD, onboarding & wallet ledger
│   │   ├── orderRepo.ts           # Order persistence, OTP verification & feedback tracking
│   │   ├── productRepo.ts         # Catalog queries & stock decrement
│   │   └── userRepo.ts            # User auth, profile & Base64 avatar persistence
│   ├── routes/
│   │   ├── admin.ts               # Admin inventory, analytics, order fulfillment & agent management
│   │   ├── agent.ts               # Delivery agent registration, login, OTP verification & payments
│   │   ├── auth.ts                # Customer registration, login, profile & custom avatar upload
│   │   ├── carts.ts               # Basket creation, items add/update/delete
│   │   ├── orders.ts              # Order placement, OTP verification & customer feedback loop
│   │   └── products.ts            # Product catalog, filtering, and reviews endpoints
│   ├── services/
│   │   └── emailService.ts        # Brevo HTTPS REST mailer (port 443) with Zoho SMTP fallback
│   ├── app.ts                     # Shared Express application setup & middleware
│   ├── seedData.ts                # Verified seed products, categories, and user accounts
│   └── swaggerDoc.ts              # OpenAPI 3.0 specification & Graphviz DOT workflow
├── src/
│   ├── components/
│   │   ├── AdminPanelModal.tsx    # Admin inventory, products, orders & delivery agents dashboard
│   │   ├── AuthModal.tsx          # Login & registration modal
│   │   ├── CartDrawer.tsx         # Slide-over cart drawer with coupons & shipping tracker
│   │   ├── CheckoutModal.tsx      # Multi-step checkout with address, payment & OTP
│   │   ├── DeliveryAgentPortal.tsx# Dedicated delivery agent portal (tasks, OTP, Cash/UPI)
│   │   ├── FeedbackReminderModal.tsx # Post-delivery 5-star rating & review prompt
│   │   ├── Header.tsx             # Navbar with live search, wishlist, currency & user menu
│   │   ├── HeroBanner.tsx         # Interactive promotional carousel & flash deals timer
│   │   ├── NewsletterSection.tsx  # VIP subscription box & customer FAQ accordion
│   │   ├── OrdersModal.tsx        # Order history, delivery timeline, OTP badge & invoices
│   │   ├── ProductCard.tsx        # Product card with wishlist heart, badges & quick-add
│   │   ├── ProductDetailModal.tsx # Full PDP view with sizing, variants & customer reviews
│   │   ├── ProfileModal.tsx       # Gender-matched avatars & custom JPG/PNG 5MB upload
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
