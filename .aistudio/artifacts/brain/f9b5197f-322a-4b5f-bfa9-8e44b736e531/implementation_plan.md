# Structured WhatsApp Order Messages & Context-Aware Header Button

Upgrades TechStore's WhatsApp order flow so every product order message opens cleanly structured with the product name, clean specs (never empty parentheses), UGX price, direct product link, and Delivery/Payment lines, while making the top header WhatsApp button context-aware of the current Product Details Page or saved cart.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Confirmed user preferences governing this update:
> - **1-Tap WhatsApp Launch (Confirmed)**: Clicking any **Order** button continues to launch WhatsApp immediately with zero extra modal friction.
> - **Structured Single-Item Message Format (Confirmed)**: Pre-fills structured lines containing Product name (plus spec only when non-empty), UGX Price, direct Product URL, and editable Delivery / Payment prompts (`Delivery area or Ttowa Mall pickup`, `MTN MoMo / Airtel Money / Cash`).
> - **Context-Aware Header & Drawer WhatsApp Button (Confirmed)**: Automatically orders the product being viewed when on a Product Details Page, sends the itemized cart order when items are saved in the cart, or sends a helpful general inquiry greeting when browsing without a selected item.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Unified Structured Product Order Message**: Replaces the single-paragraph WhatsApp text (`*Item* () priced at...`) with a crisp, scannable multi-line template showing product name, optional spec, clear UGX price, direct canonical store link, and ready-to-fill Delivery & Payment lines.
  2. **Unified Cart Order Message**: Upgrades the cart drawer WhatsApp checkout to match the exact same Delivery & Payment lines below itemized quantities and UGX totals.
  3. **Context-Aware Header & Mobile Drawer Action**: Updates the header WhatsApp CTA and mobile drawer WhatsApp CTA from a static greeting string into a smart resolver that detects Product Details Pages and active saved-cart items automatically.
- **Target Audience**: Kampala shoppers tapping through to WhatsApp to confirm stock and same-day dispatch, and the TechStore sales desk receiving incoming WhatsApp inquiries who need instant clarity on SKU, exact price, product page link, delivery area, and payment preference.
- **Key Value**: Eliminates broken empty `()` spec artifacts, gives sales staff a clickable link straight back to the exact product page, prompts customers cleanly for their delivery zone and Mobile Money / cash preference, and ensures header WhatsApp taps never lose context when viewing a product or holding saved items.

---

### 2. User Experience & Visual Design

#### Structured Message Templates

**Single-Product Order Message** (Card, Quick View Modal, PDP, & Header on a PDP):
```
Hi TechStore! I'd like to order:

*Product:* Apple iPhone 17 Pro 512GB (512GB · Silver)
*Price:* UGX 5,850,000
*Link:* https://www.techstoreug.com/p/apple-iphone-17-pro-512gb/

*Delivery:* Kampala Delivery / Ttowa Mall Pickup
*Location / Notes:* 
*Payment:* MTN MoMo / Airtel Money / Cash on Delivery
```
*(When an item has no variant/spec text, the parentheses are omitted completely so `*Product:* ...` stays clean.)*

**Saved Cart Order Message** (Cart Drawer & Header when Cart has Items):
```
Hi TechStore! I'd like to order:

• 1× Apple iPhone 17 Pro 512GB — UGX 5,850,000
• 2× Apple USB-C 20W Power Adapter — UGX 170,000

*Total:* UGX 6,020,000

*Delivery:* Kampala Delivery / Ttowa Mall Pickup
*Location / Notes:* 
*Payment:* MTN MoMo / Airtel Money / Cash on Delivery
```

**General Store Greeting** (Header when Browsing Home / Shop / Categories with Empty Cart):
```
Hi TechStore! I'm browsing TechStore and would like help confirming stock and Kampala delivery.
```

#### Key User Flows
1. **Product Card / Quick View Modal / Product Details Page**: User taps **Order** or **Order on WhatsApp** → opens `wa.me/256750533222` directly with the structured single-item order message pre-filled.
2. **Product Details Page + Header Button**: User scrolls through specs and taps the sticky top **WhatsApp** button → detects active product payload on the page and sends that exact product's structured order message instead of a generic greeting.
3. **Cart / Saved Items + Header Button**: User has saved 1 or more gadgets while browsing Home or Shop and taps either **Order all on WhatsApp** or the sticky header **WhatsApp** button → sends the full itemized cart order message with quantities, line totals, grand total, and Delivery/Payment lines.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Single Shared Message Builder for Static & Dynamic Views**:
  - *Chosen Approach*: Centralize both `orderMessage(p)` and `cartOrderMessage(items)` in shared storefront logic so pre-rendered static product/category pages and live client-side interactions always generate identical WhatsApp links.
  - *Why*: Eliminates drift between static SEO cards, Quick View modals, cart checkouts, and header CTAs, and fixes the empty `()` spec bug everywhere in one pass.
  - *Alternatives Considered*: Keeping custom strings scattered across template buttons and client scripts (leads to inconsistent messages when catalog items omit specs).

- **Decision 2 — Canonical Product URL in Order Messages**:
  - *Chosen Approach*: Always attach the clean canonical product path (`/p/<slug>/` on the store domain) rather than query-heavy preview URLs.
  - *Why*: Gives the store sales desk a concise, permanent link to verify the exact capacity, finish, and current price on any device without cluttering WhatsApp chat bubbles.

- **Decision 3 — Non-Blocking Delivery & Payment Prompt Lines**:
  - *Chosen Approach*: Pre-fill editable `*Delivery:*`, `*Location / Notes:*`, and `*Payment:*` lines right inside the WhatsApp text rather than interrupting 1-tap ordering with a form popup.
  - *Why*: Preserves zero-friction 1-tap conversion while letting buyers delete an option or type their Kampala neighborhood (e.g., Kololo, Ntinda, Wakiso) directly in WhatsApp before pressing send.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### Message Resolution Flow

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │                     User Taps Any WhatsApp CTA                       │
  └─────────┬──────────────────────────┬───────────────────────┬─────────┘
            │                          │                       │
   ┌────────▼─────────┐      ┌─────────▼────────┐     ┌────────▼─────────┐
   │ Item Card / Modal│      │  Cart Drawer     │     │ Header / Mobile  │
   │  / PDP Button    │      │  Checkout CTA    │     │  Drawer Button   │
   └────────┬─────────┘      └─────────┬────────┘     └────────┬─────────┘
            │                          │                       │
            │                          │              ┌────────▼─────────┐
            │                          │              │ Context Resolver │
            │                          │              │ 1. Active PDP?   │
            │                          │              │ 2. Cart Items?   │
            │                          │              │ 3. Greeting      │
            │                          │              └────────┬─────────┘
            ▼                          ▼                       ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │               Shared Storefront Message Builders                     │
  │  • Guard empty specs (no "()") & attach canonical product URL        │
  │  • Format UGX price/totals + append Delivery & Payment prompt lines  │
  └──────────────────────────────────┬───────────────────────────────────┘
                                     ▼
                  https://wa.me/256750533222?text=<encoded>
```

#### Interactive Component & State Mapping
- **Shared Order Builder**: Consumes product (`name`, `brand`, optional `spec`, `price`, `slug`) or cart item list (`qty`, unit `price`, `slug`), omits empty specs cleanly, generates clean canonical product links, formats UGX totals, and appends standard Delivery / Location / Payment prompt lines.
- **Header & Mobile Drawer Button Handler**: Reads active page mode (`product` dataset slug + embedded product snapshot payload on PDPs) first, falls back to persisted `localStorage` saved-cart items second, and falls back to the store availability greeting when neither applies.
- **Static Page Rebuild**: Regenerates static Homepage, Shop, New In, Deals, Category, and all Product Details Pages so server-rendered static WhatsApp anchor links reflect the new structured format immediately even before client scripts hydrate.
