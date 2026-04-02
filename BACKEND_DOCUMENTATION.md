# Deep Dive: Backend Architecture Documentation

This document serves as an exhaustive reference manual for the SaaS Platform's backend architecture. It provides an in-depth look into the system's operational flow, intricate business logic, security protocols, API design, and database modeling.

---

## 1. Core Platform Configuration (`main.ts`)

The backend is built on **NestJS (Express)** and is strictly configured for production-grade security and performance.

### 1.1. Network & Security
- **CORS Strategy:** Dynamically allowed origins. In production, requests from `adeera-pos.vercel.app` and mapped custom `.duckdns.org` domains are explicitly whitelisted. It allows specific headers including `x-branch-id` (crucial for multi-branch environments).
- **Throttling (Rate Limiting):** Aggressive rate-limiting is implemented globally using `@nestjs/throttler`:
  - `short`: 50 requests / second (allows UI responsiveness)
  - `medium`: 500 requests / minute
  - `long`: 5000 requests / hour
- **Compression & Parsing:** 
  - GZIP Compression threshold set to `1024 bytes`.
  - JSON payload size limit increased to `10mb` to support heavy product imports.
  - Cookie Parser enabled to support HttpOnly enterprise authentication.

### 1.2. Request Pipeline
1. **ApiLoggingMiddleware:** Every incoming request goes through the `AuditLogService` to maintain strict compliance and non-repudiation logs.
2. **ValidationPipe:** Global DTO validation stripping non-whitelisted fields (`whitelist: true`, `forbidNonWhitelisted: true`).

---

## 2. Security & Identity (`AuthModule`)

The platform implements an **Enterprise Authentication Model**, going beyond simple JWTs.

### 2.1. Authentication Flow
- **Login (`/auth/login`):** Validates credentials, records `deviceFingerprint`, `deviceName`, and the client's IP.
- **Cookies over Payloads:** Instead of returning tokens in the payload, the backend strictly injects `access_token` and `refresh_token` as securely configured (HttpOnly) cookies via `CookieService`.
- **Session Management (`AuthSession` & `AuthDevice`):** 
  - Every login spawns an active session in the database.
  - Users can query `/auth/sessions` to see all active devices logged into their account.
  - Endpoint `/auth/sessions/revoke-others` allows a user to remotely log out all other devices if their account is compromised.

### 2.2. Role-Based Access & Scopes
- Data boundaries are strictly enforced via the `x-branch-id` header and user `tenantId`. Guarding is done using `@Permissions('view_inventory')` decorators coupled with custom `PermissionsGuard`.

---

## 3. Operations: Sales & Checkout (`SalesService`)

The core of the POS is the `SalesService`, handling complex transaction logic.

### 3.1. Transaction Ledger & Idempotency
- **Idempotency Keys:** Every `createSale` payload requires an `idempotencyKey` to prevent double-charging a customer on poor network connections.
- **Soft Delete Protection:** The system throws an error if an attempt is made to sell a product where `deletedAt != null`.

### 3.2. Split Payments & Credits (Buy-Now-Pay-Later)
The system fundamentally supports complex billing scenarios in a single transaction:
- **`isSplitPayment` Flag:** Customers can pay partly in cash, partly via M-Pesa, and put the rest on `Credit`.
- **Credit Integration:** If the payment method contains a `credit` partition, the `SalesService` wraps the `Sale` creation with a Prisma `$transaction`, automatically generating a `Credit` record tied to the customer's phone number, assigning a `dueDate`, and computing the outstanding `balance`.

### 3.3. Inventory & Realtime WebSockets
- For every sold item or variation (`ProductVariation`), stock is atomically decremented.
- Upon successful sale, `RealtimeGateway.emitSalesUpdate(saleId)` and `emitInventoryUpdate(productId)` are fired to instantly update all open POS registers globally via WebSockets (`Socket.IO`).

---

## 4. Third-Party Integrations

### 4.1. Localized Payments: Safaricom M-Pesa
The backend is deeply integrated with M-Pesa's Daraja API, providing direct STK-Push to customers.
- **Initiation (`/mpesa/initiate`):** Validates phone regex, ensures minimum amount (10 KES), floors the float values, and initiates the STK push via `MpesaService`.
- **Webhook Callback (`/mpesa/callback`):** 
  - Parses Safaricom's XML/JSON payload matching against the `CheckoutRequestID`.
  - Maps metadata (Receipt Number, Transaction Time, OrgAccountBalance).
  - **Auto-Checkout:** If the M-Pesa request was initiated via the POS cart (`saleData` attached to the pending record), a successful callback automatically invokes `SalesService.createSale`, fully completing the transaction asynchronously without cashier intervention.

### 4.2. SaaS Billing: Stripe Payments (`BillingModule`)
Manages subscription tiers and physical limits (e.g., Maximum allowed sales per month on the 'Basic' plan).
- **Webhooks:** Validates Stripe signatures against `STRIPE_WEBHOOK_SECRET` securely.
- **Micro-transactions:** For internal tenant top-ups (e.g., buying SMS credits), `/billing/record-one-time-payment` updates the `Tenant.credits` raw SQL ledger `SET credits = COALESCE(credits, 0) + [amount]`.

---

## 5. Master Data Management

### 5.1. Tenant Configuration (`TenantController`)
The ultimate root of the database hierarchy. Multi-tenancy goes as deep as visual branding:
- **Registration (`POST /tenant`):** Protected by Google reCAPTCHA v2 (`recaptchaToken`). It transactionally registers the Business, creates the Main Branch, and registers the Owner user simultaneously.
- **Branding API:** Tenants upload localized `favicon`, `receiptLogo`, `watermark`, and `etimsQrCode` to physical disk storage (`/uploads/logos`), stored with UUID filenames to prevent collisions.

### 5.2. Inventory Tracking
- Inventory isn't just a number; it's a living ledger.
- **InventoryMovement Ledger:** Every adjustment (addition, sale, refund) is logged as an immutable `InventoryMovement` (in, out, adjustment, transfer).
- **Variations Support:** Variations (e.g., Shoe sizes, T-shirt colors) maintain independent `ProductVariation` IDs, allowing discrete stock counts and prices per SKU under a parent `Product`.
- **Advanced Forecasts:** `/inventory/forecast` relies on historical ledger data to predict future reorder point breaches.

---

## 6. Development & Operations

### Deployment Footprint
Based on the `README-LOAD-BALANCING` and architecture footprints, this system is capable of high-availability clustering safely:
```bash
# Scaling up cache size in production configuration (main bootup script)
node --max-old-space-size=3072 dist/main.js
```

### Type-Safe Migrations (Prisma)
- The schema is aggressively indexed. Composite indexing (`@@index([tenantId, branchId, createdAt])`) exists purposefully to optimize wide, date-ranged BI analytics queries spanning potentially millions of sale rows.
