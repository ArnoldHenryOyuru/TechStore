# TechStore Kampala — Smart Add-Ons & Dedicated Service Pages

This upgrade adds two high-conversion capabilities inspired by Gadget Craze while keeping TechStore's homepage crisp and focused: smart **"Pairs well with"** accessory add-ons on Product Details Pages and the Saved Items drawer, plus dedicated static pages for **Kampala Delivery Zones**, **Warranty & 7-Day Returns**, and an interactive **WhatsApp Trade-In Quote Builder**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Scope & Placement Preferences**
> Your selections from the clarification step are locked into this plan:
> - **Confirmed Decision 1 — "Pairs well with" Add-Ons**: Enabled on both Product Details Pages (4 complementary catalog picks with instant `+ Add` actions) and inside the Saved Items cart drawer (dynamic 2–3 item accessory suggestions that exclude items already saved).
> - **Confirmed Decision 2 — Service, Trust & Trade-In Tools**: Dedicated interactive pages for Delivery Zones (`/delivery/`), Warranty & 7-Day Returns (`/warranty/`), and a WhatsApp Trade-In & Swap Quote Builder (`/trade-in/`).
> - **Confirmed Decision 3 — Clean Homepage Constraint**: No extra homepage sections, promotional banners, or primary top-bar navigation links will be added. Access flows cleanly through the Footer `Info` links, Product Details trust & assist cards, and the Ttowa Mall storefront card.
> - **Recommended Default — Delivery Fees & Trade-In Quotes**: Delivery zone estimates reflect realistic Kampala, Greater Kampala (Entebbe, Mukono, Wakiso), and upcountry Uganda tiers, while the Trade-In tool compiles an itemized WhatsApp appraisal request so the Ttowa Mall desk confirms exact swap value after live device inspection.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Smart Complementary Add-Ons ("Pairs well with")**: Automatically matches each device with real, in-stock, photographed accessories from the live catalog (such as fast GaN/USB-C chargers, power banks, earbuds, protective cases, and AirTags) on Product Details Pages and inside the Saved Items drawer, allowing one-tap bundling into a single WhatsApp order.
  2. **Kampala Delivery Zones & Estimator**: Gives shoppers transparent same-day dispatch cutoffs, Kampala/Greater Kampala courier pricing tiers, upcountry transit estimates, and a zone selector that generates a pre-filled WhatsApp delivery check.
  3. **Warranty & 7-Day Returns Guide**: Details TechStore's 7-day inspection cover, hardware defect rules, unopened return policy, and an inline WhatsApp return-request helper.
  4. **WhatsApp Trade-In & Swap Builder**: Walks phone/laptop upgraders through specifying their current device, condition, included accessories, and desired TechStore upgrade model to launch a structured WhatsApp quote request.
- **Target Audience**: Shoppers in Kampala and across Uganda buying smartphones, laptops, and audio gear via WhatsApp + Mobile Money who want confidence on compatibility, courier timing, buyer protection, and device upgrades before messaging.
- **Key Value**: Raises average order value via effortless accessory bundling while removing pre-purchase hesitation around delivery fees, return coverage, and phone swaps—without adding login walls, account forms, or homepage visual clutter.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Product Page → Accessory Bundle Flow**:
   - Customer opens any device page (e.g., an iPhone, Samsung Galaxy, MacBook, or console) and reviews pricing, variant chips, and Kampala guarantees.
   - Directly below the main product layout, a compact **"Pairs well with"** 4-card shelf displays in-stock photographed add-ons (charger, cable/power bank, audio/earbuds, or case).
   - Tapping `+ Add` on any add-on immediately saves the accessory to the cart, updates the header badge count, toggles the button to `Added ✓`, and surfaces a subtle confirmation toast without navigating away.
2. **Cart Drawer → Last-Minute Add-On Flow**:
   - Opening the Saved Items slide-out drawer displays the customer's selected items and UGX subtotal alongside a slim **"Pairs well with your order"** strip when fewer than three add-ons are in the cart.
   - Tapping `+ Add` inserts the accessory straight into the drawer, recalculates the live UGX total, and automatically appends it to the itemized WhatsApp checkout message.
3. **Delivery, Warranty & Trade-In Service Flows**:
   - **Delivery (`/delivery/`)**: Shoppers pick their neighborhood or Uganda town from an interactive zone selector to view estimated fee, dispatch cutoff window, and a button to message WhatsApp with that route pre-filled.
   - **Warranty (`/warranty/`)**: Shoppers scan concise policy cards (`7-day inspection cover`, `Manufacturing defects`, `Sealed returns`), a 4-step inspection timeline, and can fill a 3-field support starter (item name, order date/note, issue) that opens WhatsApp directly.
   - **Trade-In (`/trade-in/`)**: Upgraders enter their current device model, storage, condition grade, and box/ID checklist, pick the TechStore device they want to upgrade to from a live searchable dropdown, and tap **Request Trade-In Quote on WhatsApp**.

### Visual Identity & Theme

- **Aesthetic Direction**: Refined, trustworthy utilitarian retail matching TechStore's established white gallery, charcoal header, and warm amber editorial system—clean scannable tables, structured 1px-bordered cards, and zero popup/badge clutter.
- **Color Palette & Tokens**:
  - Background & Card Wells: `--bg` (`#ffffff`) and `--surface` (`#f7f7f8`) with crisp `1px solid var(--border)` (`#e5e5ea`) outlines.
  - Primary Dark Surfaces & Typography: `--charcoal` (`#18181b`) and `--text` (`#1d1d1f`) paired with `--muted` (`#6e6e73`).
  - Editorial & Interactive Accents: Warm Amber (`--accent: #f5a623`, `--accent-dark: #b86e00`, `--accent-soft: #fff8eb`) for selected states and highlights; `--green-btn` (`#2ea84e`) reserved exclusively for WhatsApp conversion CTAs.
- **Typography & Hierarchy**: Unified `DM Sans` (`--font`) inside the `1400px` wide container (`--gutter`), using `text-wrap: balance` on headings and `font-variant-numeric: tabular-nums` on all UGX fees, discounts, and subtotals.
- **Component Styling & Spatial Rhythm**:
  - PDP "Pairs well with" shelf uses a clean 4-column desktop / 2-column mobile grid with square white product wells, 2-line clamped titles, tabular prices, and compact `+ Add` pills + direct product links.
  - Service pages share a clean breadcrumb bar, concise dark-charcoal hero banner (reusing `.collection-hero` language), two-column desktop content + interactive sticky summary/action card on the right, collapsing cleanly to single column on mobile.
- **Interactive Feedback & Motion**: Subtle `-2px` card hover elevation, immediate `Added ✓` button toggle + toast notifications for cart add-ons, instant live calculation inside Trade-In and Delivery calculators, and full `prefers-reduced-motion` compliance.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Pre-Rendered PDP Add-Ons + Live Client Cart Recommendations**:
  - *Chosen Approach*: Compute category- and brand-aware add-ons at static build time for all Product Details Pages, and compute cart-aware suggestions dynamically on the client using the loaded live catalog CSV.
  - *Why*: Guarantees zero layout shift, instant Google indexability on every product page, and live de-duplication inside the cart drawer based on what the shopper currently saved.
  - *Alternatives Considered*: Purely random related items or hardcoded global accessories, which feel generic and suggest chargers/cases mismatched to laptops or audio products.
- **Decision 2 — Footer & Contextual Linking Over Header Navigation Crowding**:
  - *Chosen Approach*: Link `/delivery/`, `/warranty/`, and `/trade-in/` cleanly in the Footer `Info` column, inside Product Details trust cards / assist boxes, and within the homepage Ttowa Mall / Ordering steps box—without adding extra links to the top charcoal navigation bar.
  - *Why*: Respects the user's request to keep the homepage and primary shopping bar clean and focused on discovering products.
  - *Alternatives Considered*: Adding top-level nav links or floating homepage announcement strips, which crowd smaller screens and distract from catalog browsing.
- **Decision 3 — Interactive Trade-In & Delivery Quote Builders Driving WhatsApp**:
  - *Chosen Approach*: Interactive calculators and forms prepare structured, human-readable WhatsApp messages sent straight to TechStore's sales desk rather than capturing accounts, emails, or automated binding trade-in payouts.
  - *Why*: Matches Uganda's conversational Mobile Money + in-person inspection commerce workflow while preventing unrealistic automated valuations before physical screen/IMEI checks.
  - *Alternatives Considered*: Static text-only policy pages without interactive tools, which force customers to ask basic fee/swap questions from scratch on chat.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       LIVE GOOGLE SHEET INVENTORY                       │
│         (Products, Prices, Stock, Categories, Validated Photos)         │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │ Build-Time                              │ Runtime Fetch
                ▼                                         ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐
│   STATIC SITE GENERATOR       │         │   CLIENT STOREFRONT ENGINE    │
│ • Scores & attaches 4 PDPs    │         │ • Hydrates Cart Add-On Strip  │
│   complementary add-ons       │         │ • Handles 1-tap + Add / Saved │
│ • Emits /delivery/,           │         │ • Runs Delivery Zone Estimator│
│   /warranty/, /trade-in/      │         │ • Runs Trade-In Quote Builder │
│ • Updates sitemap.xml         │         │ • Formats WhatsApp Payloads   │
└───────────────┬───────────────┘         └───────────────┬───────────────┘
                │                                         │
                └────────────────────┬────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        RENDERED USER SURFACES                           │
│  ┌──────────────────────────┐   ┌────────────────────────────────────┐  │
│  │  Product Details Pages   │   │  Dedicated Service & Trust Pages   │  │
│  │  • "Pairs well with" 4x  │   │  • /delivery/  (Zone + Fee Calc)   │  │
│  │  • Trust links -> Policy │   │  • /warranty/  (7-Day Return Desk) │  │
│  └────────────┬─────────────┘   │  • /trade-in/ (Swap Quote Builder) │  │
│               │                 └─────────────────┬──────────────────┘  │
│               ▼                                   │                     │
│  ┌──────────────────────────┐                     │                     │
│  │   Saved Items Drawer     │                     │                     │
│  │  • Itemized UGX Subtotal │                     │                     │
│  │  • Live "Complete order" │                     │                     │
│  │    add-on suggestions    │                     │                     │
│  └────────────┬─────────────┘                     │                     │
└───────────────┼───────────────────────────────────┼─────────────────────┘
                │                                   │
                └──────────────────┬────────────────┘
                                   ▼
                 ┌───────────────────────────────────┐
                 │    WHATSAPP CONVERSION TARGET     │
                 │   wa.me/256750533222?text=...     │
                 │  (Bundled Cart / Delivery / Swap) │
                 └───────────────────────────────────┘
```

### Data Model & State

- **Accessory Pairing Rules (Shared Selector Logic)**:
  - Filters strictly to **in-stock, verified-photo** items (`price > 0`, never duplicating the current product or already-saved slugs).
  - Applies compatibility buckets per primary item category:
    - *Phones & Tablets*: Prioritizes fast USB-C / MagSafe adapters, braided cables, power banks, earbuds, protective cases, and smart tags (preferring same brand ecosystem such as Apple or Samsung first, then universal Anker/Powerology/JBL).
    - *Laptops*: Prioritizes high-wattage GaN chargers (`45W+`), hubs/adapters, bags/sleeves, keyboards/mice, and headphones.
    - *Audio / Gaming / Wearables*: Prioritizes power banks, charging cables/adapters, cases, controllers/headsets, and complementary essentials.
- **Delivery Zone Reference Dataset**:
  - Structured catalog of Ugandan delivery zones organized into three transparent dispatch tiers (Kampala CBD & suburbs, Greater Kampala ring including Entebbe/Mukono/Wakiso, and major upcountry towns), each carrying an estimated UGX fee label, dispatch window, and cutoff schedule.
- **Trade-In Request State**:
  - Captures client-side form selections (`currentBrand`, `currentModel`, `currentStorage`, `conditionGrade`, `accessoriesIncluded`, `targetUpgradeQuery` / selected catalog item, `visitPreference`) without requiring sign-in or database persistence.
- **Cart State (`localStorage`)**:
  - Persists saved items and quantities; dynamically cross-checked so both PDP add-on buttons and drawer add-on cards reflect real-time `Added ✓` status and immediately recalculate order totals.

### Interactive Component & State Mapping

- **PDP Add-On Cards (`+ Add` Handler)**:
  - Reads compact embedded product JSON payload (`slug`, `brand`, `name`, `spec`, `price`, `image_url`, `category`), appends to `savedItems` (or increments/confirms if saved), triggers `persistSavedItems()`, updates header cart count badge, flips button UI state to `Added ✓`, and refreshes the cart drawer.
- **Cart Drawer Suggestion Strip**:
  - Runs automatically inside `updateCartSheet()` whenever the drawer opens or items are added/removed; lazily triggers `ensureProductsLoaded()` if needed on static product/service pages, computes up to 3 compatible un-saved add-ons based on the primary items in cart, and binds `+ Add` handlers that immediately move the chosen add-on into the saved items list above.
- **Delivery Zone Estimator (`/delivery/`)**:
  - Binds change/click events on the zone/town selector; immediately updates displayed dispatch fee, delivery ETA window, payment eligibility, and updates the primary WhatsApp CTA payload with the exact chosen destination.
- **Warranty Return Helper (`/warranty/`)**:
  - Validates item description and issue summary inputs inline, then constructs a pre-formatted WhatsApp support message (`Product`, `Purchase Timing`, `Issue`) opening `wa.me/256750533222`.
- **Trade-In Quote Builder (`/trade-in/`)**:
  - Loads live catalog devices into a searchable upgrade target selector (with graceful fallback to manual model typing if offline), validates required current-device details (`model`, `storage`, `condition`), dynamically builds a live preview of the formatted trade-in summary card, and opens WhatsApp with the structured quote request when submitted.
