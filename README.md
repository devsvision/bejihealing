# Beji Healing

Luxury spiritual wellness website and backend-ready operations interface for Beji Healing. The public website presents Balinese healing services, healers, testimonials, location/contact information, and a premium footer, while the admin-ready modules cover booking, front office, finance, inventory, payments, and dashboard workflows.

## Current Website Blueprint

The site is a lightweight SPA built without a frontend framework:

- `index.html` is the single loader and SEO entry point.
- `router.js` controls hash routing such as `#/home`, `#/booking`, and `#/dashboard`.
- `assets/js/core.js` loads layouts, pages, and reusable HTML components with `fetch()`.
- `layouts/main-layout.html` mounts the public navbar, page content, and footer.
- `layouts/dashboard-layout.html` mounts the admin sidebar and dashboard pages.
- `pages/404.html` is the in-app SPA not-found view for invalid hash routes.
- `404.html` is the static hosting fallback for real missing URLs.
- `components/` stores reusable UI fragments such as navbar, hero, sidebar, footer, cards, tables, and loading screen.
- `pages/` stores route-level page HTML.
- `assets/css/` stores global styling, animation, glassmorphism, dashboard, and responsive rules.
- `assets/js/` stores business logic for booking, payment, front office, finance, routing helpers, state, and animation behavior.
- `services/` contains backend-ready service abstractions for Midtrans, HitPay, OttoPay, booking, finance, and front office.
- `data/` contains dummy JSON that can later be replaced by REST API responses.
- `modules/` documents domain boundaries for booking, payment, finance, dashboard, front office, and inventory.

## Public Sections

The current home page contains:

- Transparent floating header with logo, navigation, and Book Now CTA.
- Cinematic animated hero with floral/forest/spa atmosphere, mouse-follow light, logo shine, CTA buttons, and animated counters.
- Healing services section with Ritual Services and Healing Packages toggles.
- Service cards with pricing, duration, capacity, location metadata, gallery modal, About Service tab, and Healers tab.
- View More and pagination behavior for service cards.
- Meet Our Healers section with healer cards, hover fade, pagination, and full-photo modal.
- About Beji Healing section with Google Maps direction link.
- Release / Heal / Rebalance card section.
- Google-style testimonials carousel with 12 sample reviews.
- Location / Contact / Opening Hour card section.
- Full footer with logo, intro, Quick Book links, Information links, payment gateway image, copyright grid, and social icons.
- Branded 404 page with Beji Healing visual style, home CTA, and booking CTA.

## Admin And Business Modules

The dashboard-ready structure includes:

- Dashboard overview pages for revenue, bookings, occupancy, recent transactions, charts, and customer activity.
- Booking flow for program selection, dates, participants, checkout, invoice, and booking status.
- Front office flow for walk-in guests, service assignment, status tracking, payment follow-up, CRUD, and guest slips.
- Finance flow for income, expense, gateway/offline transactions, reconciliation, analytics, and export readiness.
- Payment gateway abstraction through `services/payment.service.js` and provider services.

## SEO Blueprint

The SEO setup is currently focused on local Balinese healing and wellness retreat intent.

Primary title:

```text
Beji Healing - Begin Your Healing Journey
```

Primary meta description:

```text
Experience authentic Balinese healing traditions in Bali. Book purification rituals, blessing ceremonies, palm reading, sound healing, meditation, and wellness retreat packages at Beji Healing.
```

Target keyword cluster:

- Balinese healing
- healing retreat Bali
- spiritual healing Bali
- Ubud healing retreat
- purification ritual Bali
- Balinese healer
- wellness retreat Bali
- melukat Bali
- sound healing Bali
- meditation Bali

Implemented SEO assets:

- Favicon: `assets/images/beji-healing-favicon.webp`
- Open Graph image: `assets/images/beji-healing-footer-logo.webp`
- Canonical URL: `https://www.bejihealing.com/`
- `robots.txt`
- `sitemap.xml`
- `site.webmanifest`
- Local business JSON-LD structured data in `index.html`
- Organization and WebSite JSON-LD structured data in `index.html`
- Open Graph and Twitter Card metadata
- Static 404 fallback with `noindex, follow`

Maintenance note: organic ranking cannot be guaranteed from code alone. To compete for rank 1, keep adding indexable landing pages or blog pages for each service, connect Google Search Console, verify Google Business Profile, gather real reviews, improve local citations, and publish original Bali healing content regularly.

## Local Development

Run with Node:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000/#/home
```

The Node server serves the SPA and exposes the OttoPay Hosted Payment endpoints:

- `POST /api/payments/ottopay/create`
- `POST /api/ottopay/callback`

Vercel deployments include matching serverless functions under `api/`, and Netlify deployments route the same URLs to `netlify/functions/`.

Google reviews on the home page are loaded live through `GET /api/google/reviews`, backed by Google Places API. Configure these values in `.env` or the hosting dashboard:

```text
GOOGLE_PLACES_API_KEY=
GOOGLE_PLACE_ID=
GOOGLE_PLACE_SEARCH_QUERY=Beji Healing Bali
```

`GOOGLE_PLACE_ID` is optional. If omitted, the backend uses Text Search with `GOOGLE_PLACE_SEARCH_QUERY` to find Beji Healing before loading place details and reviews. The page keeps the existing static review cards as a fallback if Google is not configured.

For stable production results, set `GOOGLE_PLACE_ID` after confirming the exact Beji Healing listing.

Create a local `.env` from `.env.example` before testing OttoPay:

```text
OTTOPAY_API_KEY=
OTTOPAY_MERCHANT_ID=
OTTOPAY_BASE_URL=https://dev-secure.ottopay.id/securepage-be
```

Set the same environment variables in the production hosting dashboard before connecting the domain:

- `OTTOPAY_API_KEY`
- `OTTOPAY_MERCHANT_ID`
- `OTTOPAY_BASE_URL`
- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_PLACE_ID`
- `GOOGLE_PLACE_SEARCH_QUERY`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `INSTAGRAM_MEDIA_LIMIT`

The Gallery page includes a live Instagram carousel backed by `GET /api/instagram/feed`. Use an Instagram Graph API access token and business account ID for `beji_healing`. If `INSTAGRAM_BUSINESS_ACCOUNT_ID` is omitted, the backend attempts Instagram Basic Display `/me/media` with the token. The section keeps static fallback cards until Instagram credentials are configured.

## Deployment

The project is ready for deployment with backend API routes:

- Vercel: `vercel.json` plus serverless functions in `api/`
- Netlify: `netlify.toml` plus functions in `netlify/functions/`
- Static-only hosting can serve the UI, but OttoPay and live Google Reviews require a Node/API-capable host.

The app uses hash routing. Production URLs should primarily index the root canonical URL:

```text
https://www.bejihealing.com/
```

For unknown direct paths, hosting should return `404.html` with a 404 status. Netlify is configured to serve `404.html` for missing routes. Vercel can use the root `404.html` fallback automatically because broad rewrites are intentionally not used.

For production SEO, update these URLs if the final domain changes:

- `index.html` canonical URL
- `index.html` Open Graph URL and image URL
- `robots.txt` sitemap URL
- `sitemap.xml` page URLs
- `site.webmanifest` start URL if needed

## Maintenance Checklist

Before pushing changes:

```bash
node --check app.js
node --check router.js
node --check assets/js/core.js
node --check assets/js/animation.js
```

For visual changes:

- Hard refresh with a new cache query version in `index.html` and `assets/js/core.js`.
- Check desktop, tablet, and mobile widths.
- Confirm hero, services, healer modal, gallery modal, testimonials carousel, info cards, and footer still render.
- Confirm public route links and admin dashboard route links still work.
- Confirm invalid hash routes such as `#/missing-page` render `pages/404.html`.
- Confirm static missing URLs use `404.html` in deployment.

## Content Ownership

Content is currently sample-ready and should be replaced with final business data:

- Healer names and biographies
- Service photos
- Service prices and durations
- Real testimonials
- Social media URLs
- Payment provider production credentials
- Final domain and analytics integrations

Currency is IDR by default. Public copy is English by default.
