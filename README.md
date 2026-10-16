# Norgez Industrial Distributor OS

A polished Next.js 14 + TypeScript + MongoDB starter for a B2B industrial distributor. Includes responsive marketing storefront, product catalog with search and MOQ display, enquiry submission, MongoDB models, email notification hook, image upload endpoint, order APIs, and a polling admin operations dashboard with order-status controls.

## Important before client delivery

This is a **working starter / demo foundation**, not a finished audited commerce platform. The included admin dashboard and read/write API routes are intentionally easy to demo and **are not yet protected by production authentication/authorization**. Before putting real customer data or money through it, add admin-only middleware/session checks to every admin API, validate and normalize all request bodies server-side, add rate limiting and spam protection, implement a real checkout/payment verification flow, and test the deployment. The Razorpay dependency is installed but payment capture/webhooks are not implemented. WhatsApp integration is not implemented; configure a provider such as WhatsApp Cloud API separately. The dashboard refreshes every 10 seconds; it is polling, not a websocket push connection.

## Requirements

- Node.js 20 LTS recommended
- MongoDB Atlas database
- Optional: Resend account for email, Cloudinary account for image uploads

## Local setup

1. Extract this ZIP and open the folder in VS Code.
2. Install Node.js 20+ if needed.
3. In terminal, run `npm install`.
4. Copy `.env.example` to `.env.local`.
   - Put your MongoDB Atlas connection string in `MONGODB_URI`.
   - Set `DISTRIBUTOR_EMAIL` to the address that should receive alerts.
   - Email requires `RESEND_API_KEY`. For production, verify a sending domain in Resend and set `RESEND_FROM_EMAIL` to an approved sender. Without a key, email is logged as a mock in the terminal.
   - `NEXTAUTH_*` are reserved for adding authentication; auth is not wired to protect routes in this starter.
5. Seed the default administrator and the product catalogue: `npm run seed` (add `-- --demo` for sample orders, enquiries and bookings).
6. Start the app: `npm run dev`
7. Open `http://localhost:3000`, `/products`, and `/admin/login`. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Administrator access

The dashboard is protected by a signed, HttpOnly session cookie and requires an administrator account. There are two credential sources, and either one signs you in:

- **The environment operator** — `ADMIN_EMAIL` with `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`). This is the break-glass account and keeps working even if the database is unreachable.
- **Administrators in the `users` collection** — created by the one-time bootstrap described below.

**Default administrator on a fresh database.** When the `users` collection holds no administrator at all, the app creates one from `ADMIN_EMAIL` and `ADMIN_PASSWORD` (stored as a bcrypt hash, never in plain text). This happens automatically on the first request to `/admin/login`, and also when you run `npm run seed`. The rules that keep it safe:

- It only writes when there are **zero** administrators, so it can never overwrite, duplicate or downgrade an existing account.
- If a user with `ADMIN_EMAIL` already exists, that account is promoted to administrator instead of a second record being created.
- Without `ADMIN_EMAIL` plus `ADMIN_PASSWORD` (minimum 8 characters) or `ADMIN_PASSWORD_HASH`, it does nothing and logs why. No password is ever invented or printed to the logs.
- `ADMIN_SESSION_SECRET` is still required, because it signs the session cookie.

Changing `ADMIN_EMAIL`/`ADMIN_PASSWORD` later does not change an existing database administrator — the environment values only seed the first one. Use the break-glass environment account to get in, then update the record deliberately.

## Add a product

The API accepts `POST /api/products` with JSON similar to:

```json
{
  "title":"Industrial Bearing 6204",
  "sku":"BRG-6204",
  "hsnCode":"848210",
  "description":"Industrial-grade bearing",
  "images":["https://your-image-url"],
  "stock":100,
  "moq":10,
  "price":{"mrp":500,"distributorPrice":380,"bulkSlabs":[{"minQty":50,"price":350}]},
  "gstPercent":18,
  "isActive":true
}
```

Use an API client while developing. Do not expose an unprotected product-creation endpoint on a public production site.

## Deploy to Vercel

1. Create a private GitHub repository and push this project.
2. Go to [Vercel](https://vercel.com), import that repository, and select the Next.js framework preset.
3. In **Project → Settings → Environment Variables**, add the values from `.env.example` for Production (and Preview if needed). Do not commit `.env.local`.
4. In MongoDB Atlas, create a database user with a strong password, configure Network Access for your deployment, and use the correct database name in the connection URI. Avoid opening database access broadly unless you understand the implications.
5. Deploy. After deployment, set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to your actual HTTPS domain, then redeploy.
6. Test the homepage, product search, enquiry submission, admin polling, and order status update on the deployed URL.
7. For email, verify your sender domain with Resend, add `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, then test a real notification.

## Push to GitHub (Windows PowerShell)

```powershell
git init
git add .
git commit -m "Initial Norgez B2B distributor app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

If the repository already has a remote, inspect it with `git remote -v` rather than adding a second one.

## Routes

- `/` — marketing storefront
- `/products` — searchable product catalog + enquiry form
- `/admin/login` — administrator sign-in
- `/admin` — polling operations dashboard (orders, enquiries, bookings, catalogue, inventory, customers, notifications, settings)
- `GET/POST /api/products`
- `GET/POST /api/orders`
- `PATCH /api/orders/:id`
- `GET/POST /api/inquiries`
- `GET/POST /api/bookings`
- `POST /api/upload` — Cloudinary image upload

## Production readiness checklist

- [x] Protect `/admin` and every administrative API with server-side session checks (`requireAdmin` on every admin route, `isSameOrigin` on every mutation).
- [ ] Rotate `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` before go-live, and give each operator their own account instead of sharing one credential.
- [ ] Add customer registration/login, session handling, password reset, and account security.
- [ ] Validate product IDs and quantities on the server; calculate prices and GST on the server rather than trusting browser totals.
- [ ] Implement Razorpay order creation, signature verification, webhook verification, refunds, and idempotency if taking payments.
- [ ] Implement WhatsApp using an approved provider and consent-aware message templates.
- [ ] Add tracking tokens/customer order lookup with access controls.
- [ ] Add inventory reservation, concurrency-safe stock updates, audit logs, rate limits, CSRF/origin protections where applicable, and error monitoring.
- [ ] Replace demo image URLs and sample stats with verified business information.
- [ ] Have a developer review security, privacy, GST invoice requirements, and operational workflows before accepting live orders.

## Image credits / usage

Demo visuals use remote Unsplash image URLs. Replace with images your business owns or is licensed to use for client production.
