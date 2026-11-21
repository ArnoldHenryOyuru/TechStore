/*
 * TechStore shared helpers.
 * Loaded in the browser (as window.TS) and by build.js in Node (require).
 * Keeping CSV parsing, slugs, stock checks, placeholder detection, price tiers
 * and card markup in ONE place ensures static pages and live JS stay identical.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const WA = '256750533222';
  const SITE_URL = 'https://www.techstoreug.com';
  const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTf_4ROfEofmZST8sC1b4XaDVF8RIddYuS2vaPDgcrxYlsrYvegbit_llsaZcWVvFv7w92tDAqO5Kof/pub?gid=213782715&single=true&output=csv';

  /* AUTO_BAD_IMAGE_URLS_START */
  const BAD_IMAGE_URLS = new Set([]);
  /* AUTO_BAD_IMAGE_URLS_END */

  const CAT_ICONS = {
    phones: '📱',
    laptops: '💻',
    audio: '🎧',
    accessories: '🔌',
    tablets: '📲',
    gaming: '🎮',
    wearables: '⌚'
  };
  const CAT_SVGS = {
    phones: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    laptops: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
    audio: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
    accessories: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    tablets: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    gaming: '<line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
    wearables: '<rect x="7" y="6" width="10" height="12" rx="2"/><path d="M9 6V3h6v3"/><path d="M9 18v3h6v-3"/>'
  };
  const CAT_LABELS = {
    all: 'All products',
    phones: 'Phones',
    laptops: 'Laptops',
    audio: 'Audio & Headphones',
    accessories: 'Accessories',
    tablets: 'Tablets',
    gaming: 'Gaming',
    wearables: 'Wearables'
  };
  const PRICE_TIERS = [
    { id: 'under-100k', label: 'Under UGX 100k', desc: 'Cables, chargers & everyday essentials', short: 'Under 100k' },
    { id: '100k-500k', label: 'UGX 100k – 500k', desc: 'Audio gear, power banks & smartwatches', short: '100k – 500k' },
    { id: '500k-1.5m', label: 'UGX 500k – 1.5M', desc: 'Mid-range phones, tablets & gaming', short: '500k – 1.5M' },
    { id: 'over-1.5m', label: 'Above UGX 1.5M', desc: 'Flagship smartphones & laptops', short: '1.5M+' }
  ];
  const WA_PATHS = '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.523 5.847L.057 23.03a1 1 0 001.23 1.23l5.183-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.793-.5-5.39-1.376l-.383-.216-3.973 1.124 1.124-3.973-.216-.383A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>';

  function waIcon(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + WA_PATHS + '</svg>';
  }

  function waLink(msg) {
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toNum(v) {
    const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function inStock(p) {
    return !/^(0|no|n|out|out of stock|sold ?out)$/i.test(String(p && p.stock || '').trim());
  }

  function hasRealPhoto(p) {
    return Boolean(p && p.image_url && !BAD_IMAGE_URLS.has(p.image_url));
  }

  function matchesPriceTier(price, tier) {
    const n = Number(price) || 0;
    if (!tier || tier === 'all') return true;
    if (tier === 'under-100k') return n > 0 && n < 100000;
    if (tier === '100k-500k') return n >= 100000 && n <= 500000;
    if (tier === '500k-1.5m') return n > 500000 && n <= 1500000;
    if (tier === 'over-1.5m') return n > 1500000;
    if (tier === 'under-200k') return n > 0 && n < 200000;
    if (tier === '200k-1m') return n >= 200000 && n <= 1000000;
    if (tier === 'over-1m') return n > 1000000;
    return true;
  }

  function parseRows(text) {
    text = String(text).replace(/^\uFEFF/, '');
    const rows = [];
    let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
        } else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = ''; rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function normalize(p) {
    p.category = (p.category || '').toLowerCase();
    p.badge = (p.badge || '').toLowerCase();
    p.price = toNum(p.price);
    p.old_price = toNum(p.old_price);
    if (p.old_price <= p.price) p.old_price = 0;
    return p;
  }

  function slugify(s) {
    return String(s || '').toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, 80).replace(/-+$/g, '');
  }

  function displayBrand(p) {
    const b = String((p && p.brand) || '').trim();
    return (!b || b.toLowerCase() === 'generic') ? '' : b;
  }

  function displayTitle(p) {
    const b = String((p && p.brand) || '').trim();
    const n = String((p && p.name) || '').trim();
    if (!b) return n;
    const escapedBrand = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stripped = n.replace(new RegExp('^' + escapedBrand + '(?:\\s+|(?=[A-Z0-9]))', 'i'), '').trim();
    return stripped || n;
  }

  function fullName(p) {
    const b = displayBrand(p);
    const n = displayTitle(p);
    if (!b) return n;
    return n.toLowerCase().indexOf(b.toLowerCase()) === 0 ? n : (b + ' ' + n).trim();
  }

  function assignSlugs(list) {
    const bases = list.map(function (p) { return slugify(fullName(p)) || 'product'; });
    const counts = {};
    bases.forEach(function (b) { counts[b] = (counts[b] || 0) + 1; });
    const used = new Set();
    list.forEach(function (p, i) {
      let s = bases[i];
      if (counts[s] > 1) {
        const extra = slugify(p.spec || '').slice(0, 30).replace(/-+$/g, '');
        if (extra) s = (s + '-' + extra).slice(0, 100);
      }
      const root = s; let n = 2;
      while (used.has(s)) s = root + '-' + (n++);
      used.add(s);
      p.slug = s;
    });
    return list;
  }

  function parseCSV(text) {
    const rows = parseRows(text);
    if (!rows.length) return [];
    const headers = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    const list = rows.slice(1)
      .filter(function (r) { return r.some(function (v) { return v.trim() !== ''; }); })
      .map(function (r) {
        const o = {};
        headers.forEach(function (h, i) { o[h] = (r[i] || '').trim(); });
        return normalize(o);
      })
      .filter(function (p) { return p.name && p.category; });
    return assignSlugs(list);
  }

  function driveUrl(url, size) {
    if (!url) return '';
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w' + (size || 400);
    return url;
  }

  function catFallbackHTML(category, hidden) {
    const paths = CAT_SVGS[category] || '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>';
    const label = CAT_LABELS[category] || 'Product';
    return '<span class="emoji-fallback media-fallback"' + (hidden ? ' style="display:none"' : '') + ' aria-hidden="true">' +
      '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>' +
      '<span class="media-fallback-label">' + esc(label) + '</span>' +
    '</span>';
  }

  function imgTag(p, cls, size) {
    const src = hasRealPhoto(p) ? driveUrl(p.image_url, size) : '';
    const alt = esc(fullName(p));
    if (src) {
      return '<img src="' + esc(src) + '" alt="' + alt + '" loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
        (cls ? ' class="' + cls + '"' : '') +
        ' onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\'">' +
        catFallbackHTML(p.category, true);
    }
    return catFallbackHTML(p && p.category, false);
  }

  function formatPrice(n) {
    return 'UGX ' + Number(n).toLocaleString('en-US');
  }

  function savings(p) {
    if (!p.old_price || !p.price || p.old_price <= p.price) return null;
    return Math.round((1 - Number(p.price) / Number(p.old_price)) * 100);
  }

  function productUrl(p) {
    return p && p.slug ? SITE_URL + '/p/' + p.slug + '/' : '';
  }

  function orderMessage(p) {
    const specText = String((p && p.spec) || '').trim();
    const itemTitle = fullName(p) + (specText ? ' (' + specText + ')' : '');
    const lines = [
      'Hi TechStore! I\'d like to order:',
      '',
      '*Product:* ' + itemTitle,
      '*Price:* ' + formatPrice(p.price)
    ];
    const link = productUrl(p);
    if (link) lines.push('*Link:* ' + link);
    lines.push(
      '',
      '*Delivery:* Kampala Delivery / Ttowa Mall Pickup',
      '*Location / Notes:* ',
      '*Payment:* MTN MoMo / Airtel Money / Cash on Delivery'
    );
    return lines.join('\n');
  }

  function cartOrderMessage(items) {
    const list = Array.isArray(items) ? items : [];
    const lines = ['Hi TechStore! I\'d like to order:', ''];
    let total = 0;
    list.forEach(function (p) {
      const qty = Math.max(1, Number(p.qty) || 1);
      const unit = Number(p.price) || 0;
      const lineTotal = unit * qty;
      total += lineTotal;
      const prefix = qty > 1 ? qty + '× ' : '';
      const specText = String((p && p.spec) || '').trim();
      lines.push('• ' + prefix + fullName(p) + (specText ? ' (' + specText + ')' : '') + ' — ' + formatPrice(lineTotal));
    });
    lines.push(
      '',
      '*Total:* ' + formatPrice(total),
      '',
      '*Delivery:* Kampala Delivery / Ttowa Mall Pickup',
      '*Location / Notes:* ',
      '*Payment:* MTN MoMo / Airtel Money / Cash on Delivery'
    );
    return lines.join('\n');
  }

  function trustItemsHTML(p) {
    const isPhone = p && p.category === 'phones';
    const shieldIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
    const truckIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>';
    const walletIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
    const refreshIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
    const items = [
      { icon: shieldIcon, title: isPhone ? 'Brand new & IMEI verified' : 'Genuine & sealed', sub: 'Checked before dispatch' },
      { icon: truckIcon, title: 'Same-day Kampala delivery', sub: 'Or pickup at Ttowa Mall' },
      { icon: walletIcon, title: 'Pay when it arrives', sub: 'MTN MoMo, Airtel Money & cash' },
      { icon: refreshIcon, title: '7-day return cover', sub: 'Hassle-free support desk' }
    ];
    return '<div class="trust-grid">' + items.map(function (it) {
      return '<div class="trust-item"><span class="trust-ico">' + it.icon + '</span><div><strong>' + it.title + '</strong><span>' + it.sub + '</span></div></div>';
    }).join('') + '</div>';
  }

  function sortPhotoFirst(list) {
    const newestFirst = list.slice().reverse();
    const photoInStock = [];
    const photoOut = [];
    const noPhotoInStock = [];
    const noPhotoOut = [];
    for (let i = 0; i < newestFirst.length; i++) {
      const p = newestFirst[i];
      const photo = hasRealPhoto(p);
      const stock = inStock(p);
      if (photo && stock) photoInStock.push(p);
      else if (photo) photoOut.push(p);
      else if (stock) noPhotoInStock.push(p);
      else noPhotoOut.push(p);
    }
    return photoInStock.concat(photoOut, noPhotoInStock, noPhotoOut);
  }

  function cardHTML(p, o) {
    o = o || {};
    const interactive = !!o.interactive;
    const available = inStock(p);
    const pct = savings(p);
    const href = '/p/' + p.slug + '/';
    const slugAttr = esc(p.slug);
    const order = interactive
      ? '<button type="button" class="order-btn" onclick="event.stopPropagation();orderWABySlug(\'' + slugAttr + '\')">' + waIcon(13) + ' Order</button>'
      : '<a class="order-btn" href="' + esc(waLink(orderMessage(p))) + '" target="_blank" rel="noopener">' + waIcon(13) + ' Order</a>';
    const wish = interactive
      ? '<button type="button" class="wish-btn ' + (o.saved ? 'active' : '') + '" aria-label="' + (o.saved ? 'Remove from saved items' : 'Save item') + '" onclick="event.stopPropagation();toggleSaveBySlug(\'' + slugAttr + '\',this)">' + (o.saved ? '❤️' : '🤍') + '</button>'
      : '';
    const statusTag = !available
      ? '<div class="badge out">Out of stock</div>'
      : (p.badge ? '<div class="badge ' + esc(p.badge) + '">' + esc(p.badge) + '</div>' : '');

    const brandLabel = displayBrand(p);
    const titleLabel = displayTitle(p);

    return '<article class="card' + (available ? '' : ' is-out') + '"' + (interactive ? ' onclick="openModalBySlug(\'' + slugAttr + '\')"' : '') + '>' +
      '<div class="card-img">' +
        statusTag +
        wish + imgTag(p) +
      '</div>' +
      '<div class="card-body">' +
        (brandLabel ? '<div class="card-brand">' + esc(brandLabel) + '</div>' : '') +
        '<h3 class="card-name"><a href="' + href + '"' + (interactive ? ' onclick="event.stopPropagation()"' : '') + '>' + esc(titleLabel) + '</a></h3>' +
        '<div class="card-spec">' + esc(p.spec) + '</div>' +
        '<div class="card-footer">' +
          '<div class="price-wrap">' +
            '<span class="price">' + formatPrice(p.price) + '</span>' +
            (p.old_price ? '<span class="old-price">' + formatPrice(p.old_price) + '</span>' : '') +
            (pct ? '<span class="savings">Save ' + pct + '%</span>' : '') +
          '</div>' + order +
        '</div>' +
      '</div>' +
    '</article>';
  }

  const DEAL_BRANDS = new Set([
    'anker', 'jbl', 'samsung', 'apple', 'sony', 'xiaomi',
    'porodo', 'green lion', 'logitech', 'nintendo', 'playstation'
  ]);

  function curateNewIn(list, cat) {
    const reversed = list.slice().reverse().filter(function (p) {
      return inStock(p) && (!cat || cat === 'all' || p.category === cat);
    });
    const taggedImg = reversed.filter(function (p) { return p.badge === 'new' && hasRealPhoto(p); });
    const restImg = reversed.filter(function (p) { return p.badge !== 'new' && hasRealPhoto(p); });
    const taggedNoImg = reversed.filter(function (p) { return p.badge === 'new' && !hasRealPhoto(p); });
    const limit = (!cat || cat === 'all') ? 96 : 48;
    return taggedImg.concat(restImg, taggedNoImg).slice(0, limit);
  }

  function curateDeals(list, cat) {
    const reversed = list.slice().reverse().filter(function (p) {
      return inStock(p) && (!cat || cat === 'all' || p.category === cat);
    });
    const onSale = reversed
      .filter(function (p) { return p.badge === 'sale' || (p.old_price > p.price); })
      .sort(function (a, b) {
        return (hasRealPhoto(b) ? 1 : 0) - (hasRealPhoto(a) ? 1 : 0) || (savings(b) || 0) - (savings(a) || 0);
      });
    const used = new Set(onSale.map(function (p) { return p.slug; }));
    const valuePicks = reversed.filter(function (p) {
      if (used.has(p.slug) || !hasRealPhoto(p)) return false;
      const b = (p.brand || '').toLowerCase();
      return p.badge === 'hot' || (p.price >= 45000 && p.price <= 500000 && DEAL_BRANDS.has(b));
    });
    valuePicks.forEach(function (p) { used.add(p.slug); });
    const combined = onSale.concat(valuePicks);
    if (combined.length < 16) {
      const fill = reversed.filter(function (p) { return !used.has(p.slug) && hasRealPhoto(p); });
      combined.push.apply(combined, fill.slice(0, 16 - combined.length));
    }
    const limit = (!cat || cat === 'all') ? 96 : 48;
    return combined.slice(0, limit);
  }

  return {
    WA: WA, SHEET_CSV: SHEET_CSV, CAT_ICONS: CAT_ICONS, CAT_LABELS: CAT_LABELS, PRICE_TIERS: PRICE_TIERS,
    BAD_IMAGE_URLS: BAD_IMAGE_URLS,
    esc: esc, toNum: toNum, inStock: inStock, hasRealPhoto: hasRealPhoto, matchesPriceTier: matchesPriceTier,
    parseCSV: parseCSV, slugify: slugify, fullName: fullName, displayBrand: displayBrand, displayTitle: displayTitle, assignSlugs: assignSlugs,
    driveUrl: driveUrl, imgTag: imgTag, formatPrice: formatPrice, savings: savings,
    waIcon: waIcon, waLink: waLink, productUrl: productUrl, orderMessage: orderMessage, cartOrderMessage: cartOrderMessage, trustItemsHTML: trustItemsHTML, sortPhotoFirst: sortPhotoFirst,
    cardHTML: cardHTML, curateNewIn: curateNewIn, curateDeals: curateDeals
  };
});
