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

const { esc, formatPrice, fullName, displayBrand, displayTitle, waLink, inStock, hasRealPhoto, savings, trustItemsHTML, sortPhotoFirst, PRICE_TIERS, curateNewIn, curateDeals } = TS;
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
    (related.length
      ? '  <section class="pdp-related"><h2>More ' + esc(cat ? cat.label.toLowerCase() : 'products') + ' you may like</h2><div class="products">' +
        related.map(r => TS.cardHTML(r, { interactive: false })).join('') + '</div></section>\n'
      : '') +
    '  <section class="pdp-cats"><h2>Browse categories</h2><div class="chips">' + catLinks + '</div></section>\n' +
    '</main>\n\n' + shellParts.footerAndOverlays + '\n</body>\n</html>\n';
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
  Object.keys(CATS).forEach(k => fs.rmSync(path.join(ROOT, k), { recursive: true, force: true }));

  const urls = [SITE + '/', SITE + '/shop/', SITE + '/new-in/', SITE + '/deals/'];
  write('index.html', buildHome(tpl, products));
  write('shop/index.html', buildShop(tpl, products));

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

  console.log('✔ ' + products.length + ' products → homepage + /shop/ + /new-in/ + /deals/ + ' +
    Object.keys(byCat).filter(k => CATS[k]).length + ' category pages, ' +
    products.length + ' product pages, sitemap with ' + urls.length + ' URLs');
  if (noPrice) console.warn('⚠ ' + noPrice + ' product(s) have no valid price (shown as "UGX 0" and left out of structured data).');
}

main().catch(err => { console.error('Build failed:', err.message); process.exit(1); });
