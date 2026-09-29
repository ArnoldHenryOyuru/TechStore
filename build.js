#!/usr/bin/env node
/*
 * TechStore SEO build.
 *
 * Reads your Google Sheet and writes plain HTML that Google can crawl:
 *   index.html                  home page with the first products already in the HTML
 *   /phones/ /laptops/ ...      one page per category
 *   /p/<product-name>/          one page per product (with Product structured data)
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
const HOME_CARD_LIMIT = 24;   // products written into the home page HTML (the rest load via JavaScript)
const CAT_CARD_LIMIT = 200;   // products written into each category page
const OG_IMAGE = SITE + '/og-image.png';
const PHONE_E164 = '+' + TS.WA;

const { esc, formatPrice, fullName, waLink } = TS;

/* ---------- Category copy. Edit freely: this is the text Google reads on each category page. ---------- */
const CATS = {
  phones: {
    label: 'Phones', title: 'Phones for Sale in Kampala – New & IMEI Verified | TechStore',
    h1: 'Phones in Kampala',
    desc: 'Shop brand new, IMEI-verified phones in Kampala at clear UGX prices. Same-day delivery in Kampala, nationwide shipping, pay with MTN MoMo or Airtel Money.',
    intro: 'Every phone at TechStore is brand new and IMEI verified. Compare prices in UGX, order on WhatsApp and pay with MTN Mobile Money or Airtel Money, with same-day delivery in Kampala.'
  },
  laptops: {
    label: 'Laptops', title: 'Laptops for Sale in Kampala, Uganda | TechStore',
    h1: 'Laptops in Kampala',
    desc: 'Browse genuine laptops in Kampala with clear UGX prices. Same-day delivery in Kampala, nationwide shipping and Mobile Money payment.',
    intro: 'Find a genuine laptop for work, study or gaming, with the price and specs shown up front. Order on WhatsApp, pay with Mobile Money and get same-day delivery in Kampala.'
  },
  audio: {
    label: 'Audio', title: 'Headphones, Earbuds & Speakers in Kampala | TechStore',
    h1: 'Headphones, Earbuds & Speakers in Kampala',
    desc: 'Genuine headphones, earbuds and speakers in Kampala at clear UGX prices. Same-day delivery in Kampala and nationwide shipping.',
    intro: 'Shop genuine audio gear with clear prices in UGX. Order on WhatsApp, pay with MTN Mobile Money or Airtel Money and get same-day delivery in Kampala.'
  },
  accessories: {
    label: 'Accessories', title: 'Phone & Laptop Accessories in Kampala | TechStore',
    h1: 'Phone & Laptop Accessories in Kampala',
    desc: 'Chargers, cables, cases and more in Kampala. Genuine accessories at clear UGX prices with same-day delivery in Kampala.',
    intro: 'Chargers, cables, cases and other everyday accessories, all genuine and priced in UGX. Order on WhatsApp and pay with Mobile Money.'
  },
  gaming: {
    label: 'Gaming', title: 'Gaming Consoles & Accessories in Kampala | TechStore',
    h1: 'Gaming in Kampala',
    desc: 'Gaming consoles, controllers and accessories in Kampala at clear UGX prices. Genuine products, same-day delivery in Kampala.',
    intro: 'Consoles, controllers and gaming accessories with clear UGX prices. Order on WhatsApp, pay with Mobile Money and get same-day delivery in Kampala.'
  },
  wearables: {
    label: 'Wearables', title: 'Smartwatches & Wearables in Kampala | TechStore',
    h1: 'Smartwatches & Wearables in Kampala',
    desc: 'Genuine smartwatches and wearables in Kampala at clear UGX prices. Same-day delivery in Kampala and nationwide shipping.',
    intro: 'Smartwatches and fitness wearables with prices in UGX. Order on WhatsApp, pay with MTN Mobile Money or Airtel Money and get same-day delivery in Kampala.'
  }
};

/* ---------- helpers ---------- */
function ld(obj) {
  // "<" escaped so a stray "</script>" in product text can never break the page
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}
function clip(s, n) {
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : cut.length).replace(/[ ,.;:–-]+$/, '') + '…';
}
function sub(html, token, value) { return html.split(token).join(value); } // split/join: no "$&" replacement surprises
function write(rel, content) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function inStock(p) { return !/^(0|no|n|out|out of stock|sold ?out)$/i.test((p.stock || '').trim()); }

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
    '  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet">',
    '  <link rel="stylesheet" href="/style.css">'
  ].join('\n');
}

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: it[1] }))
  };
}

const storeLd = {
  '@context': 'https://schema.org', '@type': 'ElectronicsStore',
  '@id': SITE + '/#store', name: 'TechStore', url: SITE + '/', image: OG_IMAGE,
  telephone: PHONE_E164,
  address: { '@type': 'PostalAddress', streetAddress: 'Ttowa Mall', addressLocality: 'Kampala', addressCountry: 'UG' },
  areaServed: { '@type': 'Country', name: 'Uganda' },
  currenciesAccepted: 'UGX', paymentAccepted: 'MTN Mobile Money, Airtel Money, Cash'
};
const siteLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'TechStore', url: SITE + '/', inLanguage: 'en-UG' };

function activeChip(html, cat) {
  html = html.replace('class="chip active"', 'class="chip"');
  return html.replace(new RegExp('class="chip"( onclick="filterCat\\(\'' + cat + '\',this\\)")'), 'class="chip active"$1');
}

/* ---------- page builders ---------- */
function gridHTML(list, limit) {
  const shown = list.slice(0, limit);
  return '<div class="products">' + shown.map(p => TS.cardHTML(p, { interactive: false })).join('') + '</div>';
}

function buildHome(tpl, products, skeleton) {
  const url = SITE + '/';
  const title = 'TechStore Kampala – Phones, Laptops & Electronics in Uganda';
  const desc = 'Buy brand new, IMEI-verified phones, laptops and electronics in Kampala. Clear UGX prices, same-day Kampala delivery, nationwide shipping, Mobile Money.';
  let html = tpl;
  html = sub(html, '{{HEAD}}', head({ title, desc, url }) + '\n  ' + ld(storeLd) + '\n  ' + ld(siteLd));
  html = sub(html, '{{BODY_ATTR}}', '');
  html = html.replace('<!--HOME_ONLY-->', '').replace('<!--/HOME_ONLY-->', '');
  html = sub(html, '{{COUNT}}', skeleton ? '—' : String(products.length));
  html = sub(html, '{{CAT_LABEL}}', 'All products');
  html = sub(html, '{{GRID}}', skeleton
    ? '<div class="loading-state"><div class="spinner"></div><span>Loading products...</span></div>'
    : gridHTML(products, HOME_CARD_LIMIT));
  return html;
}

function buildCategory(tpl, key, list) {
  const c = CATS[key];
  const url = SITE + '/' + key + '/';
  let html = tpl;
  const collection = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.h1, url: url, description: c.desc,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: list.slice(0, CAT_CARD_LIMIT).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + '/p/' + p.slug + '/', name: fullName(p) }))
    }
  };
  const crumbs = breadcrumbLd([['Home', SITE + '/'], [c.label, url]]);
  html = sub(html, '{{HEAD}}', head({ title: c.title, desc: c.desc, url }) + '\n  ' + ld(collection) + '\n  ' + ld(crumbs));
  html = sub(html, '{{BODY_ATTR}}', ' data-cat="' + key + '"');
  const header =
    '<header class="cat-hero">\n' +
    '  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>' + esc(c.label) + '</span></nav>\n' +
    '  <h1>' + esc(c.h1) + '</h1>\n' +
    '  <p>' + esc(c.intro) + '</p>\n' +
    '</header>';
  html = html.replace(/<!--HOME_ONLY-->[\s\S]*?<!--\/HOME_ONLY-->/, () => header);
  html = activeChip(html, key);
  html = sub(html, '{{COUNT}}', String(list.length));
  html = sub(html, '{{CAT_LABEL}}', esc(c.label));
  html = sub(html, '{{GRID}}', gridHTML(list, CAT_CARD_LIMIT));
  return html;
}

function productDesc(p) {
  const name = fullName(p);
  const bits = [name + ' price in Uganda: ' + formatPrice(p.price) + '.'];
  if (p.spec) bits.push(p.spec.replace(/[.\s]+$/, '') + '.');
  bits.push('Same-day delivery in Kampala; pay by MTN MoMo or Airtel Money.');
  return clip(bits.join(' '), 158);
}

function buildProduct(footer, p, products) {
  const name = fullName(p);
  const url = SITE + '/p/' + p.slug + '/';
  const cat = CATS[p.category];
  const long = name + ' Price in Uganda | TechStore Kampala';
  const title = long.length <= 66 ? long : clip(name, 44) + ' | TechStore Kampala';
  const desc = productDesc(p);
  const isPhone = p.category === 'phones';
  const available = inStock(p);
  const pct = TS.savings(p);

  const offer = {
    '@type': 'Offer', url: url, priceCurrency: 'UGX', price: String(p.price),
    availability: 'https://schema.org/' + (available ? 'InStock' : 'OutOfStock'),
    seller: { '@type': 'Organization', name: 'TechStore' }
  };
  if (isPhone) offer.itemCondition = 'https://schema.org/NewCondition';
  const productLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: name,
    description: p.spec ? name + ' – ' + p.spec : name,
    url: url, category: cat ? cat.label : p.category
  };
  if (p.brand) productLd.brand = { '@type': 'Brand', name: p.brand };
  const img = TS.driveUrl(p.image_url, 800);
  if (img) productLd.image = [img];
  if (p.price > 0) productLd.offers = offer;

  const crumbItems = [['Home', SITE + '/']];
  if (cat) crumbItems.push([cat.label, SITE + '/' + p.category + '/']);
  crumbItems.push([name, url]);

  const related = products
    .filter(o => o !== p && o.category === p.category)
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
    .slice(0, 4);

  const catLinks = Object.keys(CATS)
    .map(k => '<a class="chip' + (k === p.category ? ' active' : '') + '" href="/' + k + '/">' + TS.CAT_ICONS[k] + ' ' + esc(CATS[k].label) + '</a>')
    .join('');

  const crumbsHtml = '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span>' +
    (cat ? '<a href="/' + p.category + '/">' + esc(cat.label) + '</a><span>›</span>' : '') +
    '<span>' + esc(name) + '</span></nav>';

  const about = 'The ' + esc(name) + ' is available at TechStore in Kampala for ' + formatPrice(p.price) + '. ' +
    (isPhone ? 'Every phone we sell is brand new and IMEI verified. ' : 'All our products are genuine. ') +
    'Order on WhatsApp and pay with MTN Mobile Money or Airtel Money. We offer same-day delivery in Kampala and nationwide shipping.';

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    head({ title, desc, url, type: 'product' }) + '\n  ' + ld(productLd) + '\n  ' + ld(breadcrumbLd(crumbItems)) + '\n</head>\n<body>\n\n' +
    '<nav>\n  <a class="logo" href="/"><span class="logo-dot"></span>TechStore</a>\n' +
    '  <ul class="nav-links">\n    <li><a href="/#shop">Shop</a></li>\n    <li><a href="/phones/">Phones</a></li>\n    <li><a href="/laptops/">Laptops</a></li>\n  </ul>\n' +
    '  <div class="nav-right"><a class="wa-nav-btn" href="' + esc(waLink('Hi TechStore! I\'d like to place an order.')) + '" target="_blank" rel="noopener" style="text-decoration:none">' + TS.waIcon(14) + '<span>WhatsApp</span></a></div>\n</nav>\n\n' +
    '<main class="pdp">\n  ' + crumbsHtml + '\n' +
    '  <article class="pdp-grid">\n' +
    '    <div class="pdp-img">' + TS.imgTag(p, '', 800).replace(' loading="lazy"', ' fetchpriority="high"') + '</div>\n' +
    '    <div class="pdp-info">\n' +
    '      <div class="modal-brand">' + esc(p.brand) + '</div>\n' +
    '      <h1 class="modal-name">' + esc(p.name) + '</h1>\n' +
    '      <p class="modal-spec">' + esc(p.spec) + '</p>\n' +
    (available ? '' : '      <div class="pdp-stock">Currently out of stock – message us on WhatsApp for restock dates.</div>\n') +
    '      <div class="modal-price-row"><div><div class="modal-price">' + formatPrice(p.price) + '</div>' +
      (p.old_price ? '<div class="modal-old">' + formatPrice(p.old_price) + '</div>' : '') + '</div>' +
      (pct ? '<div class="modal-save">You save ' + pct + '%</div>' : '') + '</div>\n' +
    '      <div class="modal-badges">' +
      (isPhone ? '<div class="modal-badge-item">🆕 <span>Brand New</span></div><div class="modal-badge-item">🔎 <span>IMEI Verified</span></div>' : '<div class="modal-badge-item">✅ <span>Genuine</span></div>') +
      '<div class="modal-badge-item">🚚 <span>Same-day delivery</span></div><div class="modal-badge-item">📱 <span>Mobile Money</span></div><div class="modal-badge-item">🔄 <span>7-day returns</span></div></div>\n' +
    '      <a class="modal-order-btn" href="' + esc(waLink(TS.orderMessage(p))) + '" target="_blank" rel="noopener">' + TS.waIcon(18) + ' Order on WhatsApp</a>\n' +
    '      <p class="pdp-note">Prices are in UGX. We confirm availability and delivery on WhatsApp before you pay.</p>\n' +
    '    </div>\n  </article>\n\n' +
    '  <section class="pdp-about"><h2>Buy ' + esc(name) + ' in Kampala</h2><p>' + about + '</p></section>\n' +
    (related.length
      ? '  <section class="pdp-related"><h2>More ' + esc(cat ? cat.label.toLowerCase() : 'products') + ' you may like</h2><div class="products">' +
        related.map(r => TS.cardHTML(r, { interactive: false })).join('') + '</div></section>\n'
      : '') +
    '  <section class="pdp-cats"><h2>Browse categories</h2><div class="chips">' + catLinks + '</div></section>\n' +
    '</main>\n\n' + footer + '\n</body>\n</html>\n';
}

function buildSitemap(urls) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url><loc>' + esc(u) + '</loc></url>').join('\n') + '\n</urlset>\n';
}

/* ---------- main ---------- */
async function loadCSV() {
  if (CSV_FILE) return fs.readFileSync(path.resolve(CSV_FILE), 'utf8');
  const res = await fetch(SHEET_CSV);
  if (!res.ok) throw new Error('Could not fetch the sheet (HTTP ' + res.status + ')');
  return res.text();
}

async function main() {
  // node build.js --skeleton : home page only, no product data (works before the first real build)
  if (process.argv.includes('--skeleton')) {
    const t = fs.readFileSync(path.join(ROOT, 'index.template.html'), 'utf8');
    write('index.html', buildHome(t, [], true));
    console.log('✔ wrote skeleton index.html (products load via JavaScript until you run a full build)');
    return;
  }
  const text = await loadCSV();
  const products = TS.parseCSV(text);
  if (products.length === 0) {
    console.error('No products found in the sheet. Nothing was changed.');
    process.exit(1);
  }

  const tpl = fs.readFileSync(path.join(ROOT, 'index.template.html'), 'utf8');
  const footerMatch = tpl.match(/<!-- FOOTER -->[\s\S]*?<\/footer>/);
  if (!footerMatch) throw new Error('index.template.html: footer markers not found');
  const footer = footerMatch[0];

  // Start clean so removed products / empty categories don't leave stale pages behind
  fs.rmSync(path.join(ROOT, 'p'), { recursive: true, force: true });
  Object.keys(CATS).forEach(k => fs.rmSync(path.join(ROOT, k), { recursive: true, force: true }));

  const urls = [SITE + '/'];
  write('index.html', buildHome(tpl, products));

  const byCat = {};
  products.forEach(p => { (byCat[p.category] = byCat[p.category] || []).push(p); });
  Object.keys(byCat).forEach(k => {
    if (!CATS[k]) console.warn('⚠ Category "' + k + '" (' + byCat[k].length + ' products) has no page. Add it to CATS in build.js.');
  });
  Object.keys(CATS).forEach(k => {
    if (!byCat[k]) return; // no thin/empty category pages
    write(k + '/index.html', buildCategory(tpl, k, byCat[k]));
    urls.push(SITE + '/' + k + '/');
  });

  let noPrice = 0;
  products.forEach(p => {
    if (!(p.price > 0)) noPrice++;
    write('p/' + p.slug + '/index.html', buildProduct(footer, p, products));
    urls.push(SITE + '/p/' + p.slug + '/');
  });

  write('sitemap.xml', buildSitemap(urls));
  write('robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');

  console.log('✔ ' + products.length + ' products → ' + Object.keys(byCat).filter(k => CATS[k]).length + ' category pages, ' +
    products.length + ' product pages, sitemap with ' + urls.length + ' URLs');
  if (noPrice) console.warn('⚠ ' + noPrice + ' product(s) have no valid price (shown as "UGX 0" and left out of structured data).');
}

main().catch(err => { console.error('Build failed:', err.message); process.exit(1); });
