#!/usr/bin/env node
/*
 * TechStore SEO build.
 *
 * Reads the Google Sheet CSV and writes static HTML pages:
 *   index.html                  curated storefront homepage (hero bento, categories, budget tiers, brand showcase, store info)
 *   /shop/                      full filterable catalogue (supports ?q, ?cat, ?brand, ?price, ?page)
 *   /new-in/                    newly tagged arrivals + latest flagship releases
 *   /deals/                     on-sale & discounted items + value picks
 *   /phones/, /laptops/, ...    one page per category
 *   /p/<product-name>/          one page per product (with Product + Breadcrumb structured data & full cart/nav)
 *   sitemap.xml, robots.txt
 *
 * Run:  node build.js        (Node 18+, no npm install needed)
 * Test with a local file:  CSV_FILE=sample.csv node build.js
 * Skeleton home page only: node build.js --skeleton
 */
'use strict';

const fs = require('fs');
const path = require('path');
const TS = require('./ts-shared.js');

const ROOT = __dirname;
const SITE = (process.env.SITE_URL || 'https://www.techstoreug.com').replace(/\/+$/, '');
const SHEET_CSV = process.env.SHEET_CSV || TS.SHEET_CSV;
const CSV_FILE = process.env.CSV_FILE || '';
const CATALOG_CARD_LIMIT = 24;
const SITEMAP_CAT_LIMIT = 200;
const OG_IMAGE = SITE + '/og-image.png';
const PHONE_E164 = '+' + TS.WA;

const { esc, formatPrice, fullName, displayBrand, displayTitle, waLink, inStock, hasRealPhoto, savings, trustItemsHTML, sortPhotoFirst, pickPairings, DELIVERY_ZONES, deliveryCheckMessage, PRICE_TIERS, curateNewIn, curateDeals } = TS;
const AUDIT_CACHE_FILE = path.join(ROOT, '.image-audit-cache.json');
const SHARED_FILE = path.join(ROOT, 'ts-shared.js');

const CATS = {
  phones: {
    label: 'Phones',
    blurb: 'IMEI-verified smartphones',
    title: 'Phones for Sale in Kampala – New & IMEI Verified | TechStore',
    h1: 'Phones in Kampala',
    desc: 'Shop brand new, IMEI-verified phones in Kampala at clear UGX prices. Same-day delivery in Kampala, nationwide shipping, pay with MTN MoMo or Airtel Money.',
    intro: 'Every phone at TechStore is brand new and IMEI verified. Compare prices in UGX, order on WhatsApp and pay with MTN Mobile Money or Airtel Money.'
  },
  laptops: {
    label: 'Laptops',
    blurb: 'Work, study & creator machines',
    title: 'Laptops for Sale in Kampala, Uganda | TechStore',
    h1: 'Laptops in Kampala',
    desc: 'Browse genuine laptops in Kampala with clear UGX prices. Same-day delivery in Kampala, nationwide shipping and Mobile Money payment.',
    intro: 'Find a genuine laptop for work, study or gaming, with the price and specs shown up front. Order on WhatsApp and pay with Mobile Money.'
  },
  audio: {
    label: 'Audio',
    blurb: 'Headphones, earbuds & speakers',
    title: 'Headphones, Earbuds & Speakers in Kampala | TechStore',
    h1: 'Headphones, Earbuds & Speakers in Kampala',
    desc: 'Genuine headphones, earbuds and speakers in Kampala at clear UGX prices. Same-day delivery in Kampala and nationwide shipping.',
    intro: 'Shop genuine audio gear with clear prices in UGX. Order on WhatsApp and pay with MTN Mobile Money or Airtel Money.'
  },
  accessories: {
    label: 'Accessories',
    blurb: 'Chargers, power banks & cables',
    title: 'Phone & Laptop Accessories in Kampala | TechStore',
    h1: 'Phone & Laptop Accessories in Kampala',
    desc: 'Chargers, cables, cases and more in Kampala. Genuine accessories at clear UGX prices with same-day delivery in Kampala.',
    intro: 'Chargers, cables, cases and everyday accessories, all genuine and priced in UGX. Order on WhatsApp and pay with Mobile Money.'
  },
  tablets: {
    label: 'Tablets',
    blurb: 'iPads & Android tablets',
    title: 'Tablets & iPads for Sale in Kampala | TechStore',
    h1: 'Tablets in Kampala',
    desc: 'Shop genuine iPads and Android tablets in Kampala at clear UGX prices. Same-day Kampala delivery and Mobile Money payment.',
    intro: 'Explore tablets for reading, design, study and everyday portability with transparent UGX pricing.'
  },
  gaming: {
    label: 'Gaming',
    blurb: 'Consoles, controllers & headsets',
    title: 'Gaming Consoles & Accessories in Kampala | TechStore',
    h1: 'Gaming in Kampala',
    desc: 'Gaming consoles, controllers and accessories in Kampala at clear UGX prices. Genuine products, same-day delivery in Kampala.',
    intro: 'Consoles, controllers and gaming accessories with clear UGX prices. Order on WhatsApp and pay with Mobile Money.'
  },
  wearables: {
    label: 'Wearables',
    blurb: 'Smartwatches & fitness bands',
    title: 'Smartwatches & Wearables in Kampala | TechStore',
    h1: 'Smartwatches & Wearables in Kampala',
    desc: 'Genuine smartwatches and wearables in Kampala at clear UGX prices. Same-day delivery in Kampala and nationwide shipping.',
    intro: 'Smartwatches and fitness wearables with prices in UGX. Order on WhatsApp and pay with MTN Mobile Money or Airtel Money.'
  }
};

function ld(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}

function clip(s, n) {
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : cut.length).replace(/[ ,.;:–-]+$/, '') + '…';
}

function sub(html, token, value) {
  return html.split(token).join(value);
}

function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function head({ title, desc, url, image, type }) {
  return [
    '  <title>' + esc(title) + '</title>',
    '  <meta name="google-site-verification" content="YGRLzzrGKny_I81TBs5YfOWVgIX7B2pk6nnU8oKpu2I" />',
    '  <meta name="description" content="' + esc(desc) + '">',
    '  <link rel="canonical" href="' + esc(url) + '">',
    '  <link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '  <meta property="og:type" content="' + (type || 'website') + '">',
    '  <meta property="og:site_name" content="TechStore">',
    '  <meta property="og:locale" content="en_UG">',
    '  <meta property="og:title" content="' + esc(title) + '">',
    '  <meta property="og:description" content="' + esc(desc) + '">',
    '  <meta property="og:url" content="' + esc(url) + '">',
    '  <meta property="og:image" content="' + esc(image || OG_IMAGE) + '">',
    '  <meta name="twitter:card" content="summary_large_image">',
    '  <meta name="twitter:title" content="' + esc(title) + '">',
    '  <meta name="twitter:description" content="' + esc(desc) + '">',
    '  <meta name="twitter:image" content="' + esc(image || OG_IMAGE) + '">',
    '  <link rel="preconnect" href="https://fonts.googleapis.com">',
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">',
    '  <link rel="stylesheet" href="/style.css">'
  ].join('\n');
}

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: it[1] }))
  };
}

const storeLd = {
  '@context': 'https://schema.org',
  '@type': 'ElectronicsStore',
  '@id': SITE + '/#store',
  name: 'TechStore',
  url: SITE + '/',
  image: OG_IMAGE,
  telephone: PHONE_E164,
  address: { '@type': 'PostalAddress', streetAddress: 'Ttowa Mall', addressLocality: 'Kampala', addressCountry: 'UG' },
  areaServed: { '@type': 'Country', name: 'Uganda' },
  currenciesAccepted: 'UGX',
  paymentAccepted: 'MTN Mobile Money, Airtel Money, Cash'
};

const siteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TechStore',
  url: SITE + '/',
  inLanguage: 'en-UG',
  potentialAction: {
    '@type': 'SearchAction',
    target: SITE + '/shop/?q={search_term_string}',
    'query-input': 'required name=search_term_string'
  }
};

function withActiveNav(html, navKey, drawerHref) {
  if (navKey === 'categories') {
    html = html.replace('class="nav-dd-btn"', 'class="nav-dd-btn is-active" aria-current="page"');
  } else if (navKey) {
    html = html.replace(
      new RegExp('<li><a href="/' + navKey + '/">'),
      '<li><a href="/' + navKey + '/" class="is-active" aria-current="page">'
    );
  }
  const targetHref = drawerHref || (navKey && navKey !== 'categories' ? '/' + navKey + '/' : '');
  if (targetHref) {
    html = html.replace(
      new RegExp('(<div class="mob-drawer"[\\s\\S]*?)<a href="' + targetHref + '">'),
      '$1<a href="' + targetHref + '" class="is-active" aria-current="page">'
    );
  }
  return html;
}

function standardToolbarHTML(activeCat) {
  const catButtons = [
    ['all', 'All items'],
    ['phones', 'Phones'],
    ['laptops', 'Laptops'],
    ['audio', 'Audio'],
    ['accessories', 'Accessories'],
    ['tablets', 'Tablets'],
    ['gaming', 'Gaming'],
    ['wearables', 'Wearables']
  ].map(([k, label]) =>
    '      <button type="button" class="chip' + (activeCat === k ? ' active' : '') + '" onclick="filterCat(\'' + k + '\',this)">' + label + '</button>'
  ).join('\n');

  return '  <div class="catalog-toolbar">\n' +
    '    <div class="chips" id="chip-row">\n' +
    catButtons + '\n' +
    '    </div>\n' +
    '    <div class="catalog-selects">\n' +
    '      <select class="sort-select" id="brand-filter" onchange="applyCatalogFilters()" aria-label="Filter by brand">\n' +
    '        <option value="all">All brands</option>\n' +
    '      </select>\n' +
    '      <select class="sort-select" id="price-filter" onchange="applyCatalogFilters()" aria-label="Filter by budget">\n' +
    '        <option value="all">All budgets</option>\n' +
    '        <option value="under-100k">Under UGX 100,000</option>\n' +
    '        <option value="100k-500k">UGX 100,000 – 500,000</option>\n' +
    '        <option value="500k-1.5m">UGX 500,000 – 1,500,000</option>\n' +
    '        <option value="over-1.5m">Above UGX 1,500,000</option>\n' +
    '      </select>\n' +
    '      <select class="sort-select" id="sort-select" onchange="applyCatalogFilters()" aria-label="Sort products">\n' +
    '        <option value="default">Sort: Default</option>\n' +
    '        <option value="price-asc">Price: Low to High</option>\n' +
    '        <option value="price-desc">Price: High to Low</option>\n' +
    '        <option value="name">Name A–Z</option>\n' +
    '      </select>\n' +
    '      <label class="stock-toggle">\n' +
    '        <input type="checkbox" id="stock-filter" onchange="applyCatalogFilters()">\n' +
    '        <span>In stock</span>\n' +
    '      </label>\n' +
    '      <button type="button" class="clear-filters-btn" id="clear-filters-btn" onclick="clearCatalogFilters()" hidden>Clear</button>\n' +
    '    </div>\n' +
    '  </div>';
}

function collectionHeroHTML(opts) {
  const pills = [
    ['all', opts.allLabel],
    ['phones', 'Phones'],
    ['laptops', 'Laptops'],
    ['audio', 'Audio'],
    ['accessories', 'Accessories'],
    ['tablets', 'Tablets'],
    ['gaming', 'Gaming'],
    ['wearables', 'Wearables']
  ].map(([k, label]) =>
    '<button type="button" class="collection-pill' + (k === 'all' ? ' active' : '') + '" data-cat="' + k + '" onclick="filterCollectionCat(\'' + k + '\',this)">' + esc(label) + '</button>'
  ).join('');

  return '<section class="collection-hero">\n' +
    '  <div class="collection-hero-inner">\n' +
    '    <span class="collection-kicker">' + esc(opts.kicker) + '</span>\n' +
    '    <h1 class="collection-title">' + esc(opts.h1) + '</h1>\n' +
    '    <p class="collection-sub">' + esc(opts.intro) + '</p>\n' +
    '    <div class="collection-pills" id="collection-pills" role="tablist" aria-label="Filter by category">' + pills + '</div>\n' +
    '  </div>\n' +
    '</section>';
}

function collectionBarHTML(opts) {
  return '  <div class="collection-bar">\n' +
    '    <div class="collection-bar-copy">\n' +
    '      <h2 class="section-title">' + esc(opts.barTitle) + '</h2>\n' +
    '      <p class="collection-bar-sub">' + esc(opts.barSub) + '</p>\n' +
    '    </div>\n' +
    '    <div class="collection-bar-controls">\n' +
    '      <select class="sort-select" id="sort-select" onchange="applyCatalogFilters()" aria-label="Sort products">\n' +
    '        <option value="default">Sort: Featured</option>\n' +
    '        <option value="price-asc">Price: Low to High</option>\n' +
    '        <option value="price-desc">Price: High to Low</option>\n' +
    '        <option value="name">Name A–Z</option>\n' +
    '      </select>\n' +
    '      <button type="button" class="clear-filters-btn" id="clear-filters-btn" onclick="clearCatalogFilters()" hidden>Reset</button>\n' +
    '    </div>\n' +
    '  </div>';
}

function gridHTML(list, limit) {
  const shown = list.slice(0, limit);
  return '<div class="products">' + shown.map(p => TS.cardHTML(p, { interactive: false })).join('') + '</div>';
}

function pickHeroFeatured(products) {
  const inStockImg = products.filter(p => inStock(p) && hasRealPhoto(p));
  const phones = inStockImg.filter(p => p.category === 'phones').sort((a, b) => b.price - a.price);
  const flagship = phones[0] || inStockImg[0] || products[0];

  const audioOrWearable = curateNewIn(products, 'audio')[0] ||
    inStockImg.find(p => p !== flagship && (p.category === 'audio' || p.category === 'wearables')) ||
    inStockImg.find(p => p !== flagship);

  const budgetPick = inStockImg
    .filter(p => p !== flagship && p !== audioOrWearable && p.price > 0 && p.price <= 250000 && (p.category === 'audio' || p.category === 'accessories'))
    .slice(-1)[0] || inStockImg.find(p => p !== flagship && p !== audioOrWearable);

  return { flagship, audioOrWearable, budgetPick };
}

function flagshipBentoHTML(products) {
  if (!products.length) return '<div class="spot-loading"><div class="spinner"></div></div>';
  const { flagship: p } = pickHeroFeatured(products);
  if (!p) return '';
  const pct = savings(p);
  const clockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  return '<div class="flagship-slide">' +
    '<div class="flagship-copy">' +
      '<div class="flagship-kicker">IN STOCK IN KAMPALA</div>' +
      '<h1 class="flagship-title">' + esc(fullName(p)) + '. <span class="flagship-accent">In stock now.</span></h1>' +
      '<p class="flagship-spec">' + esc(p.spec ? p.spec + ' — ' : '') + 'Brand-new &amp; sealed, delivered the same day across Kampala. Pay when it arrives.</p>' +
      '<div class="spot-price-row">' +
        '<span class="spot-price-label">From</span>' +
        '<span class="spot-price">' + formatPrice(p.price) + '</span>' +
        (p.old_price ? '<span class="spot-old-price">' + formatPrice(p.old_price) + '</span>' : '') +
        (pct ? '<span class="spot-save">Save ' + pct + '%</span>' : '') +
      '</div>' +
      '<div class="spot-urgency">' + clockIcon + '<span>Order now and it goes out today</span></div>' +
      '<div class="spot-btns">' +
        '<a class="spot-btn-primary" href="/p/' + p.slug + '/">Shop ' + esc(p.brand || 'device') + ' →</a>' +
        '<a class="spot-btn-ghost" href="' + esc(waLink(TS.orderMessage(p))) + '" target="_blank" rel="noopener">' + TS.waIcon(14) + ' Order on WhatsApp</a>' +
      '</div>' +
    '</div>' +
    '<div class="flagship-media">' + TS.imgTag(p, '', 600).replace(' loading="lazy"', ' fetchpriority="high"') + '</div>' +
  '</div>';
}

function heroSideCardsHTML(products) {
  const { audioOrWearable, budgetPick } = products.length ? pickHeroFeatured(products) : {};
  const topImg = audioOrWearable ? '<div class="side-promo-thumb">' + TS.imgTag(audioOrWearable, '', 300) + '</div>' : '';
  const botImg = budgetPick ? '<div class="side-promo-thumb">' + TS.imgTag(budgetPick, '', 300) + '</div>' : '';
  return '<a class="side-promo side-promo-amber" href="/new-in/">' +
      '<div class="side-promo-copy">' +
        '<span class="side-kicker">New arrivals</span>' +
        '<h2>Latest releases in stock</h2>' +
        '<p>Audio, foldables, laptops &amp; accessories ready today.</p>' +
        '<span class="side-cta">See what\'s new →</span>' +
      '</div>' +
      topImg +
    '</a>' +
    '<a class="side-promo side-promo-white" href="/shop/?price=under-100k">' +
      '<div class="side-promo-copy">' +
        '<span class="side-kicker">Shop by budget</span>' +
        '<h2>Great tech at every budget</h2>' +
        '<p>Chargers, earbuds &amp; essentials from under UGX 100,000.</p>' +
        '<span class="side-cta">Shop by budget →</span>' +
      '</div>' +
      botImg +
    '</a>';
}

function categoryCardsHTML(products) {
  return Object.keys(CATS).map(k => {
    const c = CATS[k];
    const rep = (products || []).slice().reverse().find(p => p.category === k && inStock(p) && hasRealPhoto(p)) ||
      (products || []).find(p => p.category === k && hasRealPhoto(p));
    const thumb = rep
      ? TS.imgTag(rep, '', 320)
      : TS.imgTag({ category: k, name: c.label, image_url: '' }, '', 320);
    return '<a class="cat-card" href="/' + k + '/">' +
      '<div class="cat-card-media">' + thumb + '</div>' +
      '<div class="cat-card-info">' +
        '<div class="cat-card-head">' +
          '<span class="cat-card-name">' + esc(c.label) + '</span>' +
          '<span class="cat-card-arrow" aria-hidden="true">→</span>' +
        '</div>' +
        '<div class="cat-card-blurb">' + esc(c.blurb) + '</div>' +
      '</div>' +
    '</a>';
  }).join('');
}

function budgetCardsHTML() {
  return PRICE_TIERS.map(tier => {
    return '<a class="budget-card" href="/shop/?price=' + esc(tier.id) + '">' +
      '<div class="budget-top">' +
        '<span class="budget-label">' + esc(tier.label) + '</span>' +
        '<span class="cat-card-arrow" aria-hidden="true">→</span>' +
      '</div>' +
      '<p class="budget-desc">' + esc(tier.desc) + '</p>' +
    '</a>';
  }).join('');
}

function pickBrandItems(products, brandName, limit) {
  const target = brandName.toLowerCase();
  const all = products.filter(p => (p.brand || '').toLowerCase() === target);
  const withImg = all.filter(p => hasRealPhoto(p));
  const preferred = withImg.filter(p => p.category === 'phones' || p.category === 'laptops' || p.category === 'audio');
  const pool = preferred.length >= limit ? preferred : withImg.concat(all.filter(p => !hasRealPhoto(p)));
  return pool.slice(0, limit);
}

function brandShowcaseHTML(products, brandName) {
  if (!products.length) return '';
  const list = pickBrandItems(products, brandName, 4);
  return '<div class="products">' + list.map(p => TS.cardHTML(p, { interactive: false })).join('') + '</div>';
}

function newInPreviewHTML(products) {
  if (!products.length) return '';
  const picks = curateNewIn(products, 'all').slice(0, 4);
  return '<div class="products">' + picks.map(p => TS.cardHTML(p, { interactive: false })).join('') + '</div>';
}

function buildHome(tpl, products) {
  const url = SITE + '/';
  const title = 'TechStore Kampala – Phones, Laptops & Electronics in Uganda';
  const desc = 'Buy brand new, IMEI-verified phones, laptops and electronics in Kampala. Clear UGX prices, same-day Kampala delivery, nationwide shipping, Mobile Money.';
  let html = tpl;
  html = sub(html, '{{HEAD}}', head({ title, desc, url }) + '\n  ' + ld(storeLd) + '\n  ' + ld(siteLd));
  html = sub(html, '{{BODY_ATTR}}', ' data-page="home"');
  html = html.replace('<!--HOME_ONLY-->', '').replace('<!--/HOME_ONLY-->', '');
  html = html.replace(/<!--CATALOG_ONLY-->[\s\S]*?<!--\/CATALOG_ONLY-->/, '');
  html = sub(html, '{{FLAGSHIP_BENTO}}', flagshipBentoHTML(products));
  html = sub(html, '{{HERO_SIDE_CARDS}}', heroSideCardsHTML(products));
  html = sub(html, '{{CATEGORY_CARDS}}', categoryCardsHTML(products));
  html = sub(html, '{{BUDGET_CARDS}}', budgetCardsHTML());
  html = sub(html, '{{BRAND_SHOWCASE}}', brandShowcaseHTML(products, 'Apple'));
  html = sub(html, '{{NEW_IN_PREVIEW}}', newInPreviewHTML(products));
  return html;
}

function buildShop(tpl, products) {
  const url = SITE + '/shop/';
  const title = 'Shop All Electronics in Kampala – Phones, Laptops & Accessories | TechStore';
  const desc = 'Browse and search genuine phones, laptops, audio gear, tablets and accessories in Kampala at clear UGX prices.';
  const ordered = sortPhotoFirst(products);
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'All Products at TechStore Kampala',
    url: url,
    description: desc,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: ordered.slice(0, SITEMAP_CAT_LIMIT).map((p, i) => ({
        '@type': 'ListItem', position: i + 1, url: SITE + '/p/' + p.slug + '/', name: fullName(p)
      }))
    }
  };
  const crumbs = breadcrumbLd([['Home', SITE + '/'], ['Shop', url]]);
  const header =
    '<header class="cat-hero">\n' +
    '  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>Shop</span></nav>\n' +
    '  <h1>All Electronics &amp; Gadgets</h1>\n' +
    '  <p>Filter our Kampala catalogue by category, brand, or UGX budget. Order any item on WhatsApp with same-day delivery.</p>\n' +
    '</header>';

  let html = tpl;
  html = sub(html, '{{HEAD}}', head({ title, desc, url }) + '\n  ' + ld(collection) + '\n  ' + ld(crumbs));
  html = sub(html, '{{BODY_ATTR}}', ' data-page="catalog" data-cat="all"');
  html = html.replace(/<!--HOME_ONLY-->[\s\S]*?<!--\/HOME_ONLY-->/, '');
  html = html.replace('<!--CATALOG_ONLY-->', '').replace('<!--/CATALOG_ONLY-->', '');
  html = withActiveNav(html, 'shop', '/shop/');
  html = sub(html, '{{CATALOG_HERO}}', header);
  html = sub(html, '{{CATALOG_TOOLBAR}}', standardToolbarHTML('all'));
  html = sub(html, '{{GRID}}', gridHTML(ordered, CATALOG_CARD_LIMIT));
  html = sub(html, '{{CATALOG_EXTRA}}', '');
  return html;
}

function buildCollectionPage(tpl, products, opts) {
  const url = SITE + '/' + opts.slug + '/';
  const curated = opts.curator(products, 'all');

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.h1,
    url: url,
    description: opts.desc,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: curated.slice(0, SITEMAP_CAT_LIMIT).map((p, i) => ({
        '@type': 'ListItem', position: i + 1, url: SITE + '/p/' + p.slug + '/', name: fullName(p)
      }))
    }
  };
  const crumbs = breadcrumbLd([['Home', SITE + '/'], ['Shop', SITE + '/shop/'], [opts.crumbLabel, url]]);
  const extraSection = '<div class="collection-bottom-cta"><a class="collection-shop-link" href="/shop/">Browse the whole shop →</a></div>';

  let html = tpl;
  html = sub(html, '{{HEAD}}', head({ title: opts.title, desc: opts.desc, url }) + '\n  ' + ld(collection) + '\n  ' + ld(crumbs));
  html = sub(html, '{{BODY_ATTR}}', ' data-page="catalog" data-cat="all" data-collection="' + esc(opts.collectionKey) + '"');
  html = html.replace(/<!--HOME_ONLY-->[\s\S]*?<!--\/HOME_ONLY-->/, '');
  html = html.replace('<!--CATALOG_ONLY-->', '').replace('<!--/CATALOG_ONLY-->', '');
  html = withActiveNav(html, opts.slug, '/' + opts.slug + '/');
  html = sub(html, '{{CATALOG_HERO}}', collectionHeroHTML(opts));
  html = sub(html, '{{CATALOG_TOOLBAR}}', collectionBarHTML(opts));
  html = sub(html, '{{GRID}}', gridHTML(curated, CATALOG_CARD_LIMIT));
  html = sub(html, '{{CATALOG_EXTRA}}', extraSection);
  return html;
}

function buildCategory(tpl, key, list) {
  const c = CATS[key];
  const url = SITE + '/' + key + '/';
  const ordered = sortPhotoFirst(list);
  let html = tpl;
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: c.h1,
    url: url,
    description: c.desc,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: ordered.slice(0, SITEMAP_CAT_LIMIT).map((p, i) => ({
        '@type': 'ListItem', position: i + 1, url: SITE + '/p/' + p.slug + '/', name: fullName(p)
      }))
    }
  };
  const crumbs = breadcrumbLd([['Home', SITE + '/'], ['Shop', SITE + '/shop/'], [c.label, url]]);
  const header =
    '<header class="cat-hero">\n' +
    '  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/shop/">Shop</a><span>›</span><span>' + esc(c.label) + '</span></nav>\n' +
    '  <h1>' + esc(c.h1) + '</h1>\n' +
    '  <p>' + esc(c.intro) + '</p>\n' +
    '</header>';

  html = sub(html, '{{HEAD}}', head({ title: c.title, desc: c.desc, url }) + '\n  ' + ld(collection) + '\n  ' + ld(crumbs));
  html = sub(html, '{{BODY_ATTR}}', ' data-page="catalog" data-cat="' + key + '"');
  html = html.replace(/<!--HOME_ONLY-->[\s\S]*?<!--\/HOME_ONLY-->/, '');
  html = html.replace('<!--CATALOG_ONLY-->', '').replace('<!--/CATALOG_ONLY-->', '');
  html = withActiveNav(html, 'categories', '/' + key + '/');
  html = sub(html, '{{CATALOG_HERO}}', header);
  html = sub(html, '{{CATALOG_TOOLBAR}}', standardToolbarHTML(key));
  html = sub(html, '{{GRID}}', gridHTML(ordered, CATALOG_CARD_LIMIT));
  html = sub(html, '{{CATALOG_EXTRA}}', '');
  return html;
}

function productDesc(p) {
  const name = fullName(p);
  const bits = [name + ' price in Uganda: ' + formatPrice(p.price) + '.'];
  if (p.spec) bits.push(p.spec.replace(/[.\s]+$/, '') + '.');
  bits.push('Same-day delivery in Kampala; pay by MTN MoMo or Airtel Money.');
  return clip(bits.join(' '), 158);
}

function baseModelFamily(p) {
  return displayTitle(p)
    .toLowerCase()
    .replace(/\b\d+\s?(gb|tb|mm|inch|in)\b/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function variantBadgeText(v, currentFamily) {
  const t = displayTitle(v);
  const capMatch = t.match(/\b(\d+\s?(?:GB|TB|mm))\b/i);
  if (capMatch && v.spec) {
    const colorBit = v.spec.split(/[·|,]/).map(s => s.trim()).find(s => !/\d+\s?(?:GB|TB)/i.test(s));
    return colorBit && colorBit.length <= 22 ? capMatch[1].toUpperCase() + ' · ' + colorBit : capMatch[1].toUpperCase();
  }
  if (capMatch) return capMatch[1].toUpperCase();
  return (v.spec || t.replace(new RegExp('^' + currentFamily.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim() || t).slice(0, 32);
}

function findVariants(p, products) {
  const family = baseModelFamily(p);
  if (!family || family.length < 4) return [];
  const brandLower = (p.brand || '').toLowerCase();
  const matches = products.filter(o =>
    o.category === p.category &&
    (o.brand || '').toLowerCase() === brandLower &&
    baseModelFamily(o) === family
  );
  if (matches.length <= 1) return [];
  return matches.slice(0, 8);
}

function pdpHighlightsHTML(p, cat) {
  const parts = String(p.spec || '').split(/[·|]/).map(s => s.trim()).filter(Boolean);
  const rows = [];
  if (displayBrand(p)) rows.push(['Brand', displayBrand(p)]);
  if (cat) rows.push(['Category', cat.label]);
  const cap = parts.find(s => /\b\d+\s?(gb|tb|mah|w|hz|mm|inch)\b/i.test(s));
  if (cap) rows.push(['Configuration', cap]);
  const finish = parts.find(s => s !== cap);
  if (finish) rows.push(['Finish / Option', finish]);
  rows.push(['Condition', p.category === 'phones' ? 'Brand new, sealed & IMEI verified' : 'Brand new & genuine']);
  rows.push(['Payment', 'MTN MoMo, Airtel Money or cash on delivery']);

  const boxMap = {
    phones: [displayTitle(p), 'Original manufacturer box & charging cable', 'TechStore receipt & 7-day inspection cover'],
    laptops: [displayTitle(p), 'Original power adapter & retail packaging', 'TechStore receipt & setup assistance'],
    tablets: [displayTitle(p), 'USB-C cable & retail box', 'TechStore receipt & 7-day inspection cover'],
    audio: [displayTitle(p), 'Charging case / cables (per retail box)', 'TechStore receipt & genuine guarantee'],
    wearables: [displayTitle(p), 'Charging puck & strap', 'TechStore receipt & genuine guarantee'],
    gaming: [displayTitle(p), 'Standard manufacturer accessories', 'TechStore receipt & 7-day cover'],
    accessories: [displayTitle(p), 'Retail sealed packaging', 'TechStore receipt & genuine guarantee']
  };
  const boxItems = boxMap[p.category] || [displayTitle(p), 'Manufacturer retail packaging', 'TechStore receipt'];

  return '<section class="pdp-highlights">' +
    '<h2>Key specifications</h2>' +
    '<dl class="pdp-spec-table">' +
      rows.map(r => '<div class="pdp-spec-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') +
    '</dl>' +
    '<h3 class="pdp-box-title">What\'s included</h3>' +
    '<ul class="pdp-included-list">' +
      boxItems.map(item => '<li>' + esc(item) + '</li>').join('') +
    '</ul>' +
  '</section>';
}

function buildProduct(shellParts, p, products) {
  const name = fullName(p);
  const url = SITE + '/p/' + p.slug + '/';
  const cat = CATS[p.category];
  const long = name + ' Price in Uganda | TechStore Kampala';
  const title = long.length <= 66 ? long : clip(name, 44) + ' | TechStore Kampala';
  const desc = productDesc(p);
  const isPhone = p.category === 'phones';
  const available = inStock(p);
  const pct = savings(p);

  const offer = {
    '@type': 'Offer',
    url: url,
    priceCurrency: 'UGX',
    price: String(p.price),
    availability: 'https://schema.org/' + (available ? 'InStock' : 'OutOfStock'),
    seller: { '@type': 'Organization', name: 'TechStore' }
  };
  if (isPhone) offer.itemCondition = 'https://schema.org/NewCondition';
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: name,
    description: p.spec ? name + ' – ' + p.spec : name,
    url: url,
    category: cat ? cat.label : p.category
  };
  if (p.brand) productLd.brand = { '@type': 'Brand', name: p.brand };
  const img = hasRealPhoto(p) ? TS.driveUrl(p.image_url, 800) : '';
  if (img) productLd.image = [img];
  if (p.price > 0) productLd.offers = offer;

  const crumbItems = [['Home', SITE + '/'], ['Shop', SITE + '/shop/']];
  if (cat) crumbItems.push([cat.label, SITE + '/' + p.category + '/']);
  crumbItems.push([name, url]);

  const variants = findVariants(p, products);
  const familyName = baseModelFamily(p);
  const variantHtml = variants.length
    ? '<div class="pdp-variants"><div class="pdp-variants-label">Available options</div><div class="pdp-variants-row">' +
      variants.map(v => {
        const active = v.slug === p.slug;
        const label = variantBadgeText(v, familyName);
        return '<a class="pdp-variant-chip' + (active ? ' active' : '') + '" href="/p/' + v.slug + '/"' + (active ? ' aria-current="true"' : '') + '>' +
          '<span>' + esc(label) + '</span>' +
          '<small>' + formatPrice(v.price) + '</small>' +
        '</a>';
      }).join('') + '</div></div>'
    : '';

  const pairings = pickPairings(p, products, 4);
  const pairsHtml = pairings.length
    ? '  <section class="pdp-pairs" aria-labelledby="pdp-pairs-title">\n' +
      '    <div class="pdp-pairs-hdr">\n' +
      '      <div>\n' +
      '        <h2 id="pdp-pairs-title">Pairs well with</h2>\n' +
      '        <p>In-stock essentials to bundle into the same Kampala delivery.</p>\n' +
      '      </div>\n' +
      '      <a class="section-link" href="/accessories/">Browse accessories →</a>\n' +
      '    </div>\n' +
      '    <div class="pairs-grid">' +
      pairings.map(a => {
        const addonBrand = displayBrand(a);
        const addonTitle = displayTitle(a);
        const addonPayload = JSON.stringify({
          slug: a.slug,
          brand: a.brand || '',
          name: a.name || '',
          spec: a.spec || '',
          price: a.price || 0,
          old_price: a.old_price || 0,
          image_url: a.image_url || '',
          category: a.category || ''
        }).replace(/</g, '\\u003c');
        return '<article class="pair-card">' +
          '<a class="pair-img" href="/p/' + a.slug + '/">' + TS.imgTag(a, '', 360) + '</a>' +
          '<div class="pair-body">' +
            (addonBrand ? '<div class="pair-brand">' + esc(addonBrand) + '</div>' : '') +
            '<h3 class="pair-name"><a href="/p/' + a.slug + '/">' + esc(addonTitle) + '</a></h3>' +
            '<div class="pair-footer">' +
              '<span class="pair-price">' + formatPrice(a.price) + '</span>' +
              '<button type="button" class="pair-add-btn" data-slug="' + esc(a.slug) + '" data-product="' + esc(addonPayload) + '" onclick="toggleAddonFromBtn(this)">+ Add</button>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join('') +
      '</div>\n  </section>\n'
    : '';

  const related = products
    .filter(o => o !== p && o.category === p.category)
    .sort((a, b) => (hasRealPhoto(b) ? 1 : 0) - (hasRealPhoto(a) ? 1 : 0) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
    .slice(0, 4);

  const catLinks = Object.keys(CATS)
    .map(k => '<a class="chip' + (k === p.category ? ' active' : '') + '" href="/' + k + '/">' + esc(CATS[k].label) + '</a>')
    .join('');

  const crumbsHtml = '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/shop/">Shop</a><span>›</span>' +
    (cat ? '<a href="/' + p.category + '/">' + esc(cat.label) + '</a><span>›</span>' : '') +
    '<span>' + esc(name) + '</span></nav>';

  const about = 'The ' + esc(name) + ' is available at TechStore in Kampala for ' + formatPrice(p.price) + '. ' +
    (isPhone ? 'Every phone we sell is brand new and IMEI verified. ' : 'All our products are genuine. ') +
    'Order on WhatsApp and pay with MTN Mobile Money or Airtel Money after inspecting your order. We deliver the same day in Greater Kampala and dispatch countrywide.';

  const productPayload = JSON.stringify({
    slug: p.slug,
    brand: p.brand || '',
    name: p.name || '',
    spec: p.spec || '',
    price: p.price || 0,
    old_price: p.old_price || 0,
    image_url: p.image_url || '',
    category: p.category || ''
  }).replace(/</g, '\\u003c');

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    head({ title, desc, url, image: img || OG_IMAGE, type: 'product' }) + '\n  ' + ld(productLd) + '\n  ' + ld(breadcrumbLd(crumbItems)) + '\n</head>\n' +
    '<body data-page="product" data-slug="' + esc(p.slug) + '">\n\n' +
    withActiveNav(shellParts.navAndDrawer, cat ? 'categories' : 'shop', cat ? '/' + p.category + '/' : '/shop/') + '\n\n' +
    '<main class="pdp">\n  ' + crumbsHtml + '\n' +
    '  <article class="pdp-grid">\n' +
    '    <div class="pdp-media-col">\n' +
    '      <div class="pdp-img">' + TS.imgTag(p, '', 800).replace(' loading="lazy"', ' fetchpriority="high"') + '</div>\n' +
    '      <div class="pdp-assist-card">\n' +
    '        <div><strong>Need help choosing or reserving?</strong><span>Chat with our Kampala desk or pick up at Ttowa Mall.</span></div>\n' +
    '        <a href="' + esc(waLink('Hi TechStore! I have a quick question about ' + name + '.')) + '" target="_blank" rel="noopener">WhatsApp 0750 533 222 →</a>\n' +
    '      </div>\n' +
    '      <div class="pdp-service-links">\n' +
    '        <a href="/delivery/">Delivery &amp; zones</a>\n' +
    '        <a href="/warranty/">7-day warranty</a>\n' +
    '        <a href="/trade-in/">Trade in old device</a>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '    <div class="pdp-info">\n' +
    (displayBrand(p) ? '      <div class="modal-brand">' + esc(displayBrand(p)) + '</div>\n' : '') +
    '      <h1 class="pdp-title">' + esc(displayTitle(p)) + '</h1>\n' +
    (p.spec ? '      <p class="pdp-spec-line">' + esc(p.spec) + '</p>\n' : '') +
    (available
      ? '      <div class="modal-stock-line is-in">In stock · Same-day dispatch in Kampala</div>\n'
      : '      <div class="pdp-stock">Currently out of stock – message us on WhatsApp for restock dates.</div>\n') +
    (variantHtml ? '      ' + variantHtml + '\n' : '') +
    '      <div class="modal-price-row"><div><div class="modal-price">' + formatPrice(p.price) + '</div>' +
      (p.old_price ? '<div class="modal-old">' + formatPrice(p.old_price) + '</div>' : '') + '</div>' +
      (pct ? '<div class="modal-save">You save ' + pct + '%</div>' : '') + '</div>\n' +
    '      <div class="pdp-actions">\n' +
    '        <a class="modal-order-btn" href="' + esc(waLink(TS.orderMessage(p))) + '" target="_blank" rel="noopener">' + TS.waIcon(18) + ' Order on WhatsApp</a>\n' +
    '        <button type="button" class="pdp-save-btn" id="pdp-save-btn" data-product="' + esc(productPayload) + '" onclick="toggleSaveFromPDP(this)">Save item</button>\n' +
    '      </div>\n' +
    '      <p class="pdp-note">Prices are in UGX. We confirm stock and delivery timing on WhatsApp before you pay.</p>\n' +
    '      ' + trustItemsHTML(p) + '\n' +
    '      ' + pdpHighlightsHTML(p, cat) + '\n' +
    '      <section class="pdp-overview"><h2>Buy ' + esc(name) + ' in Kampala</h2><p>' + about + '</p></section>\n' +
    '    </div>\n  </article>\n\n' +
    pairsHtml +
    (related.length
      ? '  <section class="pdp-related"><h2>More ' + esc(cat ? cat.label.toLowerCase() : 'products') + ' you may like</h2><div class="products">' +
        related.map(r => TS.cardHTML(r, { interactive: false })).join('') + '</div></section>\n'
      : '') +
    '  <section class="pdp-cats"><h2>Browse categories</h2><div class="chips">' + catLinks + '</div></section>\n' +
    '</main>\n\n' + shellParts.footerAndOverlays + '\n</body>\n</html>\n';
}

function buildServiceShell(shellParts, opts) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    head({ title: opts.title, desc: opts.desc, url: opts.url }) +
    (opts.ldScripts ? '\n  ' + opts.ldScripts.join('\n  ') : '') + '\n</head>\n' +
    '<body data-page="service" data-service="' + esc(opts.serviceKey) + '">\n\n' +
    withActiveNav(shellParts.navAndDrawer, '', '/' + opts.slug + '/') + '\n\n' +
    '<section class="service-hero">\n' +
    '  <div class="service-hero-inner">\n' +
    '    <nav class="crumbs crumbs-dark" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>' + esc(opts.crumbLabel) + '</span></nav>\n' +
    '    <span class="collection-kicker">' + esc(opts.kicker) + '</span>\n' +
    '    <h1 class="service-title">' + esc(opts.h1) + '</h1>\n' +
    '    <p class="service-sub">' + esc(opts.subtitle) + '</p>\n' +
    '  </div>\n' +
    '</section>\n' +
    '<main class="service-main">\n' + opts.body + '\n</main>\n\n' +
    shellParts.footerAndOverlays + '\n</body>\n</html>\n';
}

function buildDeliveryPage(shellParts) {
  const url = SITE + '/delivery/';
  const title = 'Delivery Zones, Fees & Same-Day Timing in Kampala | TechStore';
  const desc = 'Same-day delivery across Kampala & Greater Kampala, free Ttowa Mall pickup, and nationwide courier shipping across Uganda with pay on delivery.';
  const defaultZone = DELIVERY_ZONES[1];
  const zoneOptions = DELIVERY_ZONES.map(z =>
    '<option value="' + esc(z.id) + '"' + (z.id === defaultZone.id ? ' selected' : '') + '>' + esc(z.name) + '</option>'
  ).join('');
  const zoneRows = DELIVERY_ZONES.map(z =>
    '<tr>' +
      '<td><strong>' + esc(z.group) + '</strong><span>' + esc(z.name) + '</span></td>' +
      '<td class="td-num">' + esc(z.feeLabel) + '</td>' +
      '<td>' + esc(z.timing) + '</td>' +
    '</tr>'
  ).join('');

  const body =
    '<div class="service-grid">\n' +
    '  <div class="service-content">\n' +
    '    <section class="service-card">\n' +
    '      <h2>Same-day dispatch schedule</h2>\n' +
    '      <p class="service-lead">Orders confirmed on WhatsApp within dispatch hours go out the same day across Kampala. You inspect the sealed box before paying.</p>\n' +
    '      <div class="schedule-grid">\n' +
    '        <div class="schedule-item"><span>Mon – Fri Riders</span><strong>8:30 AM – 6:30 PM</strong><p>Same-day delivery across Kampala &amp; suburbs.</p></div>\n' +
    '        <div class="schedule-item"><span>Saturday Riders</span><strong>9:00 AM – 6:00 PM</strong><p>Same-day Kampala delivery &amp; full Ttowa Mall pickup.</p></div>\n' +
    '        <div class="schedule-item"><span>Ttowa Mall Pickup</span><strong>Free · 15–30 mins</strong><p>Reserve via WhatsApp and collect at our Kampala CBD desk.</p></div>\n' +
    '      </div>\n' +
    '    </section>\n' +
    '    <section class="service-card">\n' +
    '      <h2>Uganda delivery zones &amp; rates</h2>\n' +
    '      <p class="service-lead">Exact delivery fee is always confirmed with you on WhatsApp before dispatch—no surprise charges on arrival.</p>\n' +
    '      <div class="table-wrap">\n' +
    '        <table class="zone-table">\n' +
    '          <thead><tr><th>Destination</th><th>Estimated Fee</th><th>Timing</th></tr></thead>\n' +
    '          <tbody>' + zoneRows + '</tbody>\n' +
    '        </table>\n' +
    '      </div>\n' +
    '    </section>\n' +
    '    <section class="service-card">\n' +
    '      <h2>How pay-on-delivery works</h2>\n' +
    '      <ol class="service-steps">\n' +
    '        <li><span class="step-num">01</span><div><strong>Confirm stock &amp; fee on WhatsApp</strong><p>We verify your exact model, storage, colour, and rider fee before sending out.</p></div></li>\n' +
    '        <li><span class="step-num">02</span><div><strong>Inspect on arrival</strong><p>Check the sealed box and verify IMEI or serial details right in front of our rider.</p></div></li>\n' +
    '        <li><span class="step-num">03</span><div><strong>Pay with Mobile Money or cash</strong><p>Settle via MTN MoMo, Airtel Money, or cash once satisfied. Upcountry parcels ship with courier waybill proof.</p></div></li>\n' +
    '      </ol>\n' +
    '    </section>\n' +
    '  </div>\n' +
    '  <aside class="service-aside">\n' +
    '    <div class="tool-card sticky-card">\n' +
    '      <div class="tool-kicker">Interactive Estimator</div>\n' +
    '      <h2>Check your delivery zone</h2>\n' +
    '      <p class="tool-sub">Pick your area or town to see estimated fee, cutoff time, and payment options.</p>\n' +
    '      <div class="form-field">\n' +
    '        <label for="delivery-zone-select">Select destination</label>\n' +
    '        <select id="delivery-zone-select" class="form-input">' + zoneOptions + '</select>\n' +
    '      </div>\n' +
    '      <div class="zone-result" id="delivery-zone-result">\n' +
    '        <div class="zone-stat"><span>Estimated fee</span><strong id="dz-fee">' + esc(defaultZone.feeLabel) + '</strong></div>\n' +
    '        <div class="zone-stat"><span>Expected timing</span><strong id="dz-timing">' + esc(defaultZone.timing) + '</strong></div>\n' +
    '        <div class="zone-stat"><span>Dispatch window</span><strong id="dz-cutoff">' + esc(defaultZone.cutoff) + '</strong></div>\n' +
    '        <div class="zone-stat"><span>Payment</span><strong id="dz-payment">' + esc(defaultZone.payment) + '</strong></div>\n' +
    '      </div>\n' +
    '      <a id="delivery-wa-btn" class="modal-order-btn tool-cta" href="' + esc(waLink(deliveryCheckMessage(defaultZone))) + '" target="_blank" rel="noopener">' + TS.waIcon(18) + ' Confirm delivery on WhatsApp</a>\n' +
    '      <div class="tool-links"><a href="/warranty/">7-day warranty policy →</a><a href="/trade-in/">Trade in an old device →</a></div>\n' +
    '    </div>\n' +
    '  </aside>\n' +
    '</div>';

  return buildServiceShell(shellParts, {
    slug: 'delivery',
    serviceKey: 'delivery',
    crumbLabel: 'Delivery & zones',
    kicker: 'Kampala & Nationwide Uganda',
    h1: 'Delivery zones & same-day timing',
    subtitle: 'Transparent Kampala rider fees, free Ttowa Mall pickup, and tracked courier shipping to major towns across Uganda.',
    title,
    desc,
    url,
    body,
    ldScripts: [ld(breadcrumbLd([['Home', SITE + '/'], ['Delivery & zones', url]]))]
  });
}

function buildWarrantyPage(shellParts) {
  const url = SITE + '/warranty/';
  const title = 'Warranty & 7-Day Returns Policy | TechStore Kampala';
  const desc = 'Clear 7-day inspection cover, genuine hardware defect support, sealed return rules, and fast WhatsApp resolution at TechStore Ttowa Mall.';

  const body =
    '<div class="service-grid">\n' +
    '  <div class="service-content">\n' +
    '    <section class="service-card">\n' +
    '      <h2>The short version</h2>\n' +
    '      <p class="service-lead">Every product sold at TechStore is brand new and verified before dispatch. If something is faulty or not what you ordered, we make it right clearly and quickly.</p>\n' +
    '      <div class="policy-grid">\n' +
    '        <div class="policy-box"><span class="policy-badge">7 days</span><h3>Inspection &amp; mismatch cover</h3><p>If an item arrives faulty, damaged in transit, or does not match the ordered spec, notify us within 7 days for priority replacement or refund.</p></div>\n' +
    '        <div class="policy-box"><span class="policy-badge">7 days</span><h3>Sealed change-of-mind return</h3><p>Unopened items in original factory-sealed packaging with receipt can be exchanged or returned within 7 days of purchase.</p></div>\n' +
    '        <div class="policy-box"><span class="policy-badge">Warranty</span><h3>Manufacturer defect support</h3><p>Genuine brand warranties (Apple, Samsung, Anker, JBL &amp; more) are supported through our Ttowa Mall service desk for non-accidental hardware faults.</p></div>\n' +
    '      </div>\n' +
    '    </section>\n' +
    '    <section class="service-card">\n' +
    '      <h2>How a return or warranty check works</h2>\n' +
    '      <ol class="service-steps">\n' +
    '        <li><span class="step-num">01</span><div><strong>Message our support desk</strong><p>Share your product name, purchase date, and a short photo or video of the issue on WhatsApp.</p></div></li>\n' +
    '        <li><span class="step-num">02</span><div><strong>Bring it to Ttowa Mall or arrange rider pickup</strong><p>Drop off at our Kampala CBD shop or coordinate a return rider across Greater Kampala.</p></div></li>\n' +
    '        <li><span class="step-num">03</span><div><strong>Transparent inspection</strong><p>We test the device with you to confirm manufacturing faults versus physical or liquid damage.</p></div></li>\n' +
    '        <li><span class="step-num">04</span><div><strong>Replacement, repair, or Mobile Money refund</strong><p>Approved claims are resolved with a fresh swap, warranty repair, or direct MTN MoMo / Airtel Money refund.</p></div></li>\n' +
    '      </ol>\n' +
    '    </section>\n' +
    '    <section class="service-card">\n' +
    '      <h2>What is needed &amp; exclusions</h2>\n' +
    '      <ul class="service-checklist">\n' +
    '        <li>Original TechStore receipt or WhatsApp order confirmation, plus original box and cables where applicable.</li>\n' +
    '        <li>For phones &amp; tablets, Apple ID / Google account lock must be signed out prior to exchange or refund.</li>\n' +
    '        <li>Physical drops, cracked screens, liquid exposure, power-surge burns, or third-party repair tampering are not covered under warranty.</li>\n' +
    '        <li>Hygiene accessories (opened in-ear tips) are only returnable if confirmed defective.</li>\n' +
    '      </ul>\n' +
    '    </section>\n' +
    '  </div>\n' +
    '  <aside class="service-aside">\n' +
    '    <form class="tool-card sticky-card" id="warranty-form" novalidate>\n' +
    '      <div class="tool-kicker">Support Desk Helper</div>\n' +
    '      <h2>Start a return or check</h2>\n' +
    '      <p class="tool-sub">Fill in three quick details to send a structured support ticket straight to our Kampala WhatsApp desk.</p>\n' +
    '      <div class="form-field">\n' +
    '        <label for="wf-product">Product name *</label>\n' +
    '        <input type="text" id="wf-product" class="form-input" placeholder="e.g. iPhone 15 Pro 256GB or Anker Power Bank" required>\n' +
    '      </div>\n' +
    '      <div class="form-field">\n' +
    '        <label for="wf-timing">When did you buy it?</label>\n' +
    '        <select id="wf-timing" class="form-input">\n' +
    '          <option value="Within 7 days">Within 7 days</option>\n' +
    '          <option value="Within 30 days">Within 30 days</option>\n' +
    '          <option value="Over 30 days ago">Over 30 days ago</option>\n' +
    '        </select>\n' +
    '      </div>\n' +
    '      <div class="form-field">\n' +
    '        <label for="wf-type">What do you need help with?</label>\n' +
    '        <select id="wf-type" class="form-input">\n' +
    '          <option value="Faulty / hardware issue">Faulty or hardware issue</option>\n' +
    '          <option value="Wrong item or spec">Wrong item or spec received</option>\n' +
    '          <option value="Sealed unopened return">Sealed unopened return / exchange</option>\n' +
    '          <option value="Warranty verification">Warranty question</option>\n' +
    '        </select>\n' +
    '      </div>\n' +
    '      <div class="form-field">\n' +
    '        <label for="wf-details">Short note (optional)</label>\n' +
    '        <textarea id="wf-details" class="form-input form-textarea" rows="3" placeholder="Briefly describe the issue or receipt date..."></textarea>\n' +
    '      </div>\n' +
    '      <div class="form-error" id="wf-error" hidden></div>\n' +
    '      <button type="submit" class="modal-order-btn tool-cta">' + TS.waIcon(18) + ' Send Support Request on WhatsApp</button>\n' +
    '      <div class="tool-links"><a href="/delivery/">Delivery zones &amp; fees →</a><a href="/trade-in/">Trade in an old device →</a></div>\n' +
    '    </form>\n' +
    '  </aside>\n' +
    '</div>';

  return buildServiceShell(shellParts, {
    slug: 'warranty',
    serviceKey: 'warranty',
    crumbLabel: 'Warranty & returns',
    kicker: 'Buyer Protection · Ttowa Mall',
    h1: 'Warranty & 7-day returns',
    subtitle: 'Clear, practical buyer cover for every phone, laptop, and accessory bought at TechStore Kampala.',
    title,
    desc,
    url,
    body,
    ldScripts: [ld(breadcrumbLd([['Home', SITE + '/'], ['Warranty & returns', url]]))]
  });
}

function buildTradeInPage(shellParts) {
  const url = SITE + '/trade-in/';
  const title = 'Phone & Laptop Trade-In & Swaps in Kampala | TechStore';
  const desc = 'Swap your current smartphone, iPad, or laptop towards a brand-new TechStore device at Ttowa Mall Kampala. Build an instant WhatsApp trade-in quote.';

  const body =
    '<div class="service-grid">\n' +
    '  <div class="service-content">\n' +
    '    <form class="service-card tradein-form" id="tradein-form" novalidate>\n' +
    '      <h2>Tell us about your current device</h2>\n' +
    '      <p class="service-lead">Share honest details below to get a fast trade-in estimate on WhatsApp before visiting Ttowa Mall for live inspection.</p>\n' +
    '      <div class="form-row-2">\n' +
    '        <div class="form-field">\n' +
    '          <label for="ti-brand">Current device brand</label>\n' +
    '          <select id="ti-brand" class="form-input">\n' +
    '            <option value="Apple">Apple (iPhone / iPad / MacBook)</option>\n' +
    '            <option value="Samsung">Samsung Galaxy</option>\n' +
    '            <option value="Google">Google Pixel</option>\n' +
    '            <option value="Xiaomi">Xiaomi / Redmi</option>\n' +
    '            <option value="OnePlus">OnePlus</option>\n' +
    '            <option value="HP / Dell / Lenovo">HP / Dell / Lenovo Laptop</option>\n' +
    '            <option value="Other">Other Brand</option>\n' +
    '          </select>\n' +
    '        </div>\n' +
    '        <div class="form-field">\n' +
    '          <label for="ti-model">Exact model *</label>\n' +
    '          <input type="text" id="ti-model" class="form-input" placeholder="e.g. iPhone 14 Pro, Galaxy S23 Ultra, MacBook Air M2" required>\n' +
    '        </div>\n' +
    '      </div>\n' +
    '      <div class="form-field">\n' +
    '        <label>Storage capacity</label>\n' +
    '        <div class="choice-pills" id="ti-storage-pills" role="radiogroup" aria-label="Storage capacity">\n' +
    '          <button type="button" class="choice-pill" data-val="64GB">64GB</button>\n' +
    '          <button type="button" class="choice-pill" data-val="128GB">128GB</button>\n' +
    '          <button type="button" class="choice-pill active" data-val="256GB">256GB</button>\n' +
    '          <button type="button" class="choice-pill" data-val="512GB">512GB</button>\n' +
    '          <button type="button" class="choice-pill" data-val="1TB">1TB</button>\n' +
    '        </div>\n' +
    '      </div>\n' +
    '      <div class="form-field">\n' +
    '        <label>Device condition</label>\n' +
    '        <div class="cond-grid" id="ti-cond-grid" role="radiogroup" aria-label="Device condition">\n' +
    '          <button type="button" class="cond-card" data-val="Like New (no scratches, 90%+ battery)"><strong>Like New</strong><span>Clean screen &amp; frame, 90%+ battery, never repaired.</span></button>\n' +
    '          <button type="button" class="cond-card active" data-val="Good (light wear, fully working)"><strong>Good</strong><span>Minor signs of use, everything works smoothly.</span></button>\n' +
    '          <button type="button" class="cond-card" data-val="Fair (visible scuffs or battery below 80%)"><strong>Fair</strong><span>Noticeable wear or lower battery health, still functional.</span></button>\n' +
    '          <button type="button" class="cond-card" data-val="Needs Repair (cracked glass or fault)"><strong>Needs Repair</strong><span>Cracked screen/back glass or hardware fault.</span></button>\n' +
    '        </div>\n' +
    '      </div>\n' +
    '      <div class="form-field">\n' +
    '        <label for="ti-notes">Battery health &amp; notes (optional)</label>\n' +
    '        <input type="text" id="ti-notes" class="form-input" placeholder="e.g. 88% battery health, Face ID &amp; True Tone working, original screen">\n' +
    '      </div>\n' +
    '      <div class="form-field">\n' +
    '        <label>What do you have with it?</label>\n' +
    '        <div class="check-grid" id="ti-extras">\n' +
    '          <label class="check-item"><input type="checkbox" value="Original box"><span>Original box</span></label>\n' +
    '          <label class="check-item"><input type="checkbox" value="Charger / cable"><span>Original charger / cable</span></label>\n' +
    '          <label class="check-item"><input type="checkbox" value="Proof of purchase"><span>Receipt / proof of ownership</span></label>\n' +
    '          <label class="check-item"><input type="checkbox" value="National ID ready" checked><span>National ID ready for check</span></label>\n' +
    '        </div>\n' +
    '      </div>\n' +
    '      <div class="form-field target-picker-wrap">\n' +
    '        <label for="ti-target">Device you want to upgrade to (optional)</label>\n' +
    '        <input type="text" id="ti-target" class="form-input" placeholder="Search TechStore catalogue (e.g. iPhone 16 Pro, Galaxy S25)..." autocomplete="off">\n' +
    '        <div class="target-results" id="ti-target-results" hidden></div>\n' +
    '      </div>\n' +
    '      <div class="form-field">\n' +
    '        <label for="ti-handover">Preferred next step</label>\n' +
    '        <select id="ti-handover" class="form-input">\n' +
    '          <option value="WhatsApp estimate first, then Ttowa Mall swap">Get WhatsApp estimate first, then swap at Ttowa Mall</option>\n' +
    '          <option value="Walk-in inspection at Ttowa Mall today">Walk in to Ttowa Mall today for live inspection</option>\n' +
    '        </select>\n' +
    '      </div>\n' +
    '    </form>\n' +
    '    <section class="service-card">\n' +
    '      <h2>How swaps work at Ttowa Mall</h2>\n' +
    '      <ol class="service-steps">\n' +
    '        <li><span class="step-num">01</span><div><strong>Get a quick WhatsApp range</strong><p>We review your model, storage, and condition and share an estimated swap range.</p></div></li>\n' +
    '        <li><span class="step-num">02</span><div><strong>Bring your device &amp; National ID</strong><p>Visit Ttowa Mall with your device, valid National ID (or passport), and box/receipt if available.</p></div></li>\n' +
    '        <li><span class="step-num">03</span><div><strong>Live IMEI &amp; hardware check</strong><p>We verify IMEI authenticity and run a 10-minute screen, battery, and camera check in front of you.</p></div></li>\n' +
    '        <li><span class="step-num">04</span><div><strong>Pay only the top-up</strong><p>Your confirmed swap value comes straight off your brand-new TechStore device. Pay the balance via MTN MoMo, Airtel Money, or cash.</p></div></li>\n' +
    '      </ol>\n' +
    '    </section>\n' +
    '    <section class="service-card">\n' +
    '      <h2>Before you bring your device</h2>\n' +
    '      <ul class="service-checklist">\n' +
    '        <li>Back up your photos, chats, and contacts to iCloud, Google Drive, or a computer.</li>\n' +
    '        <li>Sign out of Apple ID / Google account and turn off Find My iPhone or Find My Device.</li>\n' +
    '        <li>Remove your SIM card and any microSD memory card before handover.</li>\n' +
    '        <li>Devices accepted for trade-in are never resold as brand-new TechStore stock.</li>\n' +
    '      </ul>\n' +
    '    </section>\n' +
    '  </div>\n' +
    '  <aside class="service-aside">\n' +
    '    <div class="tool-card sticky-card">\n' +
    '      <div class="tool-kicker">Live Quote Summary</div>\n' +
    '      <h2>Your trade-in request</h2>\n' +
    '      <p class="tool-sub">Exact trade-in value is confirmed in person at Ttowa Mall after live IMEI and condition verification.</p>\n' +
    '      <div class="zone-result" id="tradein-summary">\n' +
    '        <div class="zone-stat"><span>Current device</span><strong id="ti-sum-device">Apple · Enter model</strong></div>\n' +
    '        <div class="zone-stat"><span>Condition</span><strong id="ti-sum-cond">Good (light wear, fully working)</strong></div>\n' +
    '        <div class="zone-stat"><span>Included</span><strong id="ti-sum-extras">National ID ready</strong></div>\n' +
    '        <div class="zone-stat"><span>Upgrading to</span><strong id="ti-sum-target">Open to recommendations</strong></div>\n' +
    '      </div>\n' +
    '      <div class="form-error" id="ti-error" hidden></div>\n' +
    '      <button type="button" id="ti-submit-btn" class="modal-order-btn tool-cta">' + TS.waIcon(18) + ' Request Trade-In Quote on WhatsApp</button>\n' +
    '      <div class="tool-links"><a href="/phones/">Browse upgrade phones →</a><a href="/delivery/">Delivery zones &amp; fees →</a></div>\n' +
    '    </div>\n' +
    '  </aside>\n' +
    '</div>';

  return buildServiceShell(shellParts, {
    slug: 'trade-in',
    serviceKey: 'trade-in',
    crumbLabel: 'Trade-in & swaps',
    kicker: 'Upgrade at Ttowa Mall',
    h1: 'Trade in & upgrade in Kampala',
    subtitle: 'Put the value of your current phone, tablet, or laptop towards a brand-new sealed device and pay only the top-up.',
    title,
    desc,
    url,
    body,
    ldScripts: [ld(breadcrumbLd([['Home', SITE + '/'], ['Trade-in & swaps', url]]))]
  });
}

function buildSitemap(urls) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url><loc>' + esc(u) + '</loc></url>').join('\n') + '\n</urlset>\n';
}

async function loadCSV() {
  if (CSV_FILE) return fs.readFileSync(path.resolve(CSV_FILE), 'utf8');
  const res = await fetch(SHEET_CSV);
  if (!res.ok) throw new Error('Could not fetch the sheet (HTTP ' + res.status + ')');
  return res.text();
}

async function auditPlaceholderImages(products) {
  let cache = {};
  try {
    if (fs.existsSync(AUDIT_CACHE_FILE)) cache = JSON.parse(fs.readFileSync(AUDIT_CACHE_FILE, 'utf8'));
  } catch { cache = {}; }

  const urls = Array.from(new Set(products.map(p => p.image_url).filter(Boolean)));
  const toCheck = urls.filter(u => !cache[u]);
  if (toCheck.length) {
    let idx = 0;
    async function worker() {
      while (idx < toCheck.length) {
        const u = toCheck[idx++];
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5000);
          const res = await fetch(u, { method: 'HEAD', signal: ctrl.signal });
          clearTimeout(timer);
          const len = parseInt(res.headers.get('content-length') || '0', 10);
          cache[u] = { ok: res.ok, len, bad: !res.ok || len === 6078 };
        } catch {
          // Leave transient errors uncached unless consistently unreachable
        }
      }
    }
    await Promise.all(Array.from({ length: 40 }, worker));
    fs.writeFileSync(AUDIT_CACHE_FILE, JSON.stringify(cache));
  }

  const badUrls = urls.filter(u => cache[u] && cache[u].bad);
  TS.BAD_IMAGE_URLS.clear();
  badUrls.forEach(u => TS.BAD_IMAGE_URLS.add(u));

  const sharedSrc = fs.readFileSync(SHARED_FILE, 'utf8');
  const nextBlock = '/* AUTO_BAD_IMAGE_URLS_START */\n  const BAD_IMAGE_URLS = new Set(' + JSON.stringify(badUrls) + ');\n  /* AUTO_BAD_IMAGE_URLS_END */';
  const nextShared = sharedSrc.replace(/\/\* AUTO_BAD_IMAGE_URLS_START \*\/[\s\S]*?\/\* AUTO_BAD_IMAGE_URLS_END \*\//, nextBlock);
  if (nextShared !== sharedSrc) fs.writeFileSync(SHARED_FILE, nextShared);
  return badUrls.length;
}

async function main() {
  if (process.argv.includes('--skeleton')) {
    const t = fs.readFileSync(path.join(ROOT, 'index.template.html'), 'utf8');
    write('index.html', buildHome(t, []));
    console.log('✔ wrote skeleton index.html');
    return;
  }

  const text = await loadCSV();
  const products = TS.parseCSV(text);
  if (products.length === 0) {
    console.error('No products found in the sheet. Nothing was changed.');
    process.exit(1);
  }
  const placeholderCount = await auditPlaceholderImages(products);
  if (placeholderCount) console.log('✔ demoted ' + placeholderCount + ' placeholder image URL(s)');

  const tpl = fs.readFileSync(path.join(ROOT, 'index.template.html'), 'utf8');
  const navMatch = tpl.match(/<!-- HEADER -->[\s\S]*?<!-- \/HEADER -->/);
  const footerMatch = tpl.match(/<!-- FOOTER -->[\s\S]*?<\/body>/);
  if (!navMatch || !footerMatch) throw new Error('index.template.html: header or footer markers not found');
  const shellParts = {
    navAndDrawer: navMatch[0].trim(),
    footerAndOverlays: footerMatch[0].replace(/<\/body>\s*$/, '').trim()
  };

  fs.rmSync(path.join(ROOT, 'p'), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, 'shop'), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, 'new-in'), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, 'deals'), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, 'delivery'), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, 'warranty'), { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, 'trade-in'), { recursive: true, force: true });
  Object.keys(CATS).forEach(k => fs.rmSync(path.join(ROOT, k), { recursive: true, force: true }));

  const urls = [
    SITE + '/',
    SITE + '/shop/',
    SITE + '/new-in/',
    SITE + '/deals/',
    SITE + '/delivery/',
    SITE + '/warranty/',
    SITE + '/trade-in/'
  ];
  write('index.html', buildHome(tpl, products));
  write('shop/index.html', buildShop(tpl, products));
  write('delivery/index.html', buildDeliveryPage(shellParts));
  write('warranty/index.html', buildWarrantyPage(shellParts));
  write('trade-in/index.html', buildTradeInPage(shellParts));

  write('new-in/index.html', buildCollectionPage(tpl, products, {
    slug: 'new-in',
    collectionKey: 'new',
    crumbLabel: 'New In',
    kicker: 'Updated as stock lands',
    allLabel: 'All new',
    title: 'New In – Latest Phones, Laptops & Tech in Kampala | TechStore',
    h1: 'New In',
    desc: 'The newest arrivals at TechStore Kampala, latest first. Brand-new and sealed, with pay on delivery in Kampala.',
    intro: 'The newest arrivals at TechStore, latest first. Brand-new & sealed, with pay on delivery in Kampala.',
    barTitle: 'Newest first',
    barSub: 'Freshly stocked devices and latest flagship releases, newest at the top.',
    curator: curateNewIn
  }));

  write('deals/index.html', buildCollectionPage(tpl, products, {
    slug: 'deals',
    collectionKey: 'deals',
    crumbLabel: 'Deals',
    kicker: 'Price drops & value picks',
    allLabel: 'All deals',
    title: 'Deals – Price Drops & Value Picks in Kampala | TechStore',
    h1: 'Deals',
    desc: 'Save on genuine electronics, phones, audio gear and everyday tech in Kampala at clear UGX prices.',
    intro: 'Marked-down devices and standout value picks priced clearly in UGX. Pay on delivery across Kampala.',
    barTitle: 'Featured offers & value picks',
    barSub: 'Price reductions first, paired with popular everyday tech under UGX 500,000.',
    curator: curateDeals
  }));

  const byCat = {};
  products.forEach(p => { (byCat[p.category] = byCat[p.category] || []).push(p); });
  Object.keys(byCat).forEach(k => {
    if (!CATS[k]) console.warn('⚠ Category "' + k + '" (' + byCat[k].length + ' products) has no page. Add it to CATS in build.js.');
  });
  Object.keys(CATS).forEach(k => {
    if (!byCat[k]) return;
    write(k + '/index.html', buildCategory(tpl, k, byCat[k]));
    urls.push(SITE + '/' + k + '/');
  });

  let noPrice = 0;
  products.forEach(p => {
    if (!(p.price > 0)) noPrice++;
    write('p/' + p.slug + '/index.html', buildProduct(shellParts, p, products));
    urls.push(SITE + '/p/' + p.slug + '/');
  });

  write('sitemap.xml', buildSitemap(urls));
  write('robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');

  console.log('✔ ' + products.length + ' products → homepage + /shop/ + /new-in/ + /deals/ + /delivery/ + /warranty/ + /trade-in/ + ' +
    Object.keys(byCat).filter(k => CATS[k]).length + ' category pages, ' +
    products.length + ' product pages, sitemap with ' + urls.length + ' URLs');
  if (noPrice) console.warn('⚠ ' + noPrice + ' product(s) have no valid price (shown as "UGX 0" and left out of structured data).');
}

main().catch(err => { console.error('Build failed:', err.message); process.exit(1); });
