/*
 * TechStore shared helpers.
 * Loaded in the browser (as window.TS) and by build.js in Node (require).
 * Keeping CSV parsing, slugs and card markup in ONE place guarantees that the
 * pages Google sees (prerendered by build.js) match what shoppers see.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const WA = '256750533222';
  const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTf_4ROfEofmZST8sC1b4XaDVF8RIddYuS2vaPDgcrxYlsrYvegbit_llsaZcWVvFv7w92tDAqO5Kof/pub?gid=213782715&single=true&output=csv';
  const CAT_ICONS = { phones: '📱', laptops: '💻', audio: '🎧', accessories: '🔌', gaming: '🎮', wearables: '⌚' };

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

  // "UGX 1,200,000" / "1,200,000" / "1200000" -> 1200000 ; junk -> 0
  function toNum(v) {
    const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, ''));
    return isFinite(n) ? n : 0;
  }

  // Proper RFC-4180 CSV parser (handles quoted commas, quotes and line breaks in cells)
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
    if (p.old_price <= p.price) p.old_price = 0; // never show a "was" price that isn't higher
    return p;
  }

  function slugify(s) {
    return String(s || '').toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, 80).replace(/-+$/g, '');
  }

  function fullName(p) {
    const b = p.brand || '', n = p.name || '';
    return (b && n.toLowerCase().indexOf(b.toLowerCase()) === 0) ? n : (b + ' ' + n).trim();
  }

  // Stable, human-readable URLs: /p/apple-iphone-15-pro/
  // If several products share a name (e.g. same phone, different storage), ALL of them get
  // a spec suffix, so a URL never depends on the row order in the sheet.
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

  // Google Drive share link -> direct image URL
  function driveUrl(url, size) {
    if (!url) return '';
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w' + (size || 400);
    return url;
  }

  function imgTag(p, cls, size) {
    const src = driveUrl(p.image_url, size);
    const icon = CAT_ICONS[p.category] || '📦';
    const alt = esc(((p.brand || '') + ' ' + (p.name || '')).trim());
    if (src) {
      return '<img src="' + esc(src) + '" alt="' + alt + '" loading="lazy" decoding="async"' + (cls ? ' class="' + cls + '"' : '') +
        ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<span class="emoji-fallback" style="display:none">' + icon + '</span>';
    }
    return '<span class="emoji-fallback">' + icon + '</span>';
  }

  function formatPrice(n) {
    return 'UGX ' + Number(n).toLocaleString('en-US');
  }

  function savings(p) {
    if (!p.old_price || !p.price || p.old_price <= p.price) return null;
    return Math.round((1 - Number(p.price) / Number(p.old_price)) * 100);
  }

  function orderMessage(p) {
    return 'Hi TechStore! I\'d like to order the *' + p.brand + ' ' + p.name + '* (' + p.spec + ') priced at ' +
      formatPrice(p.price) + '. Please confirm availability and delivery details. Thank you!';
  }

  /*
   * One card, two modes:
   *   interactive:true  -> used by script.js (modal, save button, JS order button)
   *   interactive:false -> used by build.js (plain links: works with no JavaScript, crawlable)
   */
  function cardHTML(p, o) {
    o = o || {};
    const interactive = !!o.interactive;
    const pct = savings(p);
    const href = '/p/' + p.slug + '/';
    const order = interactive
      ? '<button class="order-btn" onclick="event.stopPropagation();orderWA(' + o.idx + ')">' + waIcon(13) + ' Order</button>'
      : '<a class="order-btn" href="' + esc(waLink(orderMessage(p))) + '" target="_blank" rel="noopener">' + waIcon(13) + ' Order</a>';
    const wish = interactive
      ? '<button class="wish-btn ' + (o.saved ? 'active' : '') + '" onclick="event.stopPropagation();toggleSave(' + o.idx + ',this)">' + (o.saved ? '❤️' : '🤍') + '</button>'
      : '';
    return '<article class="card"' + (interactive ? ' onclick="openModal(' + o.idx + ')"' : '') + '>' +
      '<div class="card-img">' +
        (p.badge ? '<div class="badge ' + esc(p.badge) + '">' + esc(p.badge) + '</div>' : '') +
        wish + imgTag(p) +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-brand">' + esc(p.brand) + '</div>' +
        '<h3 class="card-name"><a href="' + href + '"' + (interactive ? ' onclick="event.stopPropagation()"' : '') + '>' + esc(p.name) + '</a></h3>' +
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

  return {
    WA: WA, SHEET_CSV: SHEET_CSV, CAT_ICONS: CAT_ICONS,
    esc: esc, toNum: toNum, parseCSV: parseCSV, slugify: slugify, fullName: fullName, assignSlugs: assignSlugs,
    driveUrl: driveUrl, imgTag: imgTag, formatPrice: formatPrice, savings: savings,
    waIcon: waIcon, waLink: waLink, orderMessage: orderMessage, cardHTML: cardHTML
  };
});
