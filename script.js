// Shared helpers (CSV parsing, slugs, stock checks, price tiers, card markup) live in ts-shared.js
// so pre-rendered pages from build.js and live JS interactions stay identical.
const { WA, SHEET_CSV, CAT_LABELS, parseCSV, imgTag, formatPrice, savings, esc, fullName, displayBrand, displayTitle, inStock, hasRealPhoto, matchesPriceTier, trustItemsHTML, sortPhotoFirst, cardHTML, waIcon, orderMessage, cartOrderMessage, curateNewIn, curateDeals } = TS;

const PAGE_MODE = document.body.dataset.page || 'catalog';
const INITIAL_CAT = document.body.dataset.cat || 'all';
const COLLECTION_MODE = document.body.dataset.collection || '';
const STORAGE_KEY = 'techstore_saved_v1';
const PAGE_SIZE = 24;

let products = [];
let productBySlug = new Map();
let currentCat = INITIAL_CAT;
let savedItems = loadSavedItems();
let filteredCatalogList = [];
let currentPage = 1;
let csvLoadPromise = null;
let activeHomeBrand = 'Apple';

function loadSavedItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(item => item && item.slug).map(item => ({
          ...item,
          qty: Math.max(1, parseInt(item.qty || 1, 10) || 1)
        }))
      : [];
  } catch {
    return [];
  }
}

function persistSavedItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems));
  } catch {
    // Ignore storage quota errors
  }
}

function isSlugSaved(slug) {
  return savedItems.some(item => item.slug === slug);
}

function toSavedSnapshot(p) {
  return {
    slug: p.slug,
    brand: p.brand || '',
    name: p.name || '',
    spec: p.spec || '',
    price: Number(p.price) || 0,
    old_price: Number(p.old_price) || 0,
    image_url: p.image_url || '',
    category: p.category || '',
    qty: 1
  };
}

function findProduct(slug) {
  return productBySlug.get(slug) || savedItems.find(item => item.slug === slug) || null;
}

function ensureProductsLoaded() {
  if (products.length) return Promise.resolve(products);
  if (csvLoadPromise) return csvLoadPromise;
  csvLoadPromise = fetch(SHEET_CSV)
    .then(res => {
      if (!res.ok) throw new Error('fetch failed');
      return res.text();
    })
    .then(text => {
      products = parseCSV(text);
      productBySlug = new Map(products.map(p => [p.slug, p]));
      return products;
    });
  return csvLoadPromise;
}

/* ---------- Header Categories Dropdown ---------- */
function toggleCatMenu(e) {
  if (e) e.stopPropagation();
  const btn = document.getElementById('cat-menu-btn');
  const menu = document.getElementById('cat-dropdown');
  if (!btn || !menu) return;
  const open = menu.hidden;
  menu.hidden = !open;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeCatMenu() {
  const btn = document.getElementById('cat-menu-btn');
  const menu = document.getElementById('cat-dropdown');
  if (!btn || !menu) return;
  menu.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-dd-wrap')) closeCatMenu();
});

/* ---------- Static Flagship Hero ---------- */
function renderHeroBento() {
  const wrap = document.getElementById('flagship-slide-wrap');
  if (!wrap || !products.length) return;
  const inStockImg = products.filter(p => inStock(p) && hasRealPhoto(p));
  const phones = inStockImg.filter(p => p.category === 'phones').sort((a, b) => b.price - a.price);
  const p = phones[0] || inStockImg[0] || products[0];
  if (!p) return;

  const pct = savings(p);
  const slugAttr = esc(p.slug);
  const clockIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  wrap.innerHTML = `
    <div class="flagship-slide">
      <div class="flagship-copy">
        <div class="flagship-kicker">IN STOCK IN KAMPALA</div>
        <h1 class="flagship-title">${esc(fullName(p))}. <span class="flagship-accent">In stock now.</span></h1>
        <p class="flagship-spec">${esc(p.spec ? p.spec + ' — ' : '')}Brand-new &amp; sealed, delivered the same day across Kampala. Pay when it arrives.</p>
        <div class="spot-price-row">
          <span class="spot-price-label">From</span>
          <span class="spot-price">${formatPrice(p.price)}</span>
          ${p.old_price ? `<span class="spot-old-price">${formatPrice(p.old_price)}</span>` : ''}
          ${pct ? `<span class="spot-save">Save ${pct}%</span>` : ''}
        </div>
        <div class="spot-urgency">${clockIcon}<span>Order now and it goes out today</span></div>
        <div class="spot-btns">
          <button type="button" class="spot-btn-primary" onclick="openModalBySlug('${slugAttr}')">Shop ${esc(p.brand || 'device')} →</button>
          <button type="button" class="spot-btn-ghost" onclick="orderWABySlug('${slugAttr}')">${waIcon(14)} Order on WhatsApp</button>
        </div>
      </div>
      <div class="flagship-media">${imgTag(p, '', 600)}</div>
    </div>`;
}

/* ---------- Homepage Brand Showcase & New In ---------- */
function selectHomeBrand(brandName, btn) {
  activeHomeBrand = brandName;
  document.querySelectorAll('.brand-band .seg-tab').forEach(b => {
    b.classList.toggle('active', b === btn || b.dataset.brand === brandName);
  });
  const link = document.getElementById('brand-showcase-link');
  if (link) {
    link.href = '/shop/?brand=' + encodeURIComponent(brandName);
    link.textContent = 'Shop all ' + brandName + ' →';
  }
  const container = document.getElementById('brand-showcase-grid');
  if (!container || !products.length) return;

  const target = brandName.toLowerCase();
  const all = products.filter(p => (p.brand || '').toLowerCase() === target);
  const withImg = all.filter(p => hasRealPhoto(p));
  const preferred = withImg.filter(p => p.category === 'phones' || p.category === 'laptops' || p.category === 'audio');
  const pool = (preferred.length >= 4 ? preferred : withImg.concat(all.filter(p => !hasRealPhoto(p)))).slice(0, 4);

  container.innerHTML = `<div class="products">${pool.map(p =>
    cardHTML(p, { interactive: true, saved: isSlugSaved(p.slug) })
  ).join('')}</div>`;
}

function hydrateHomeNewIn() {
  const container = document.getElementById('home-new-grid');
  if (!container || !products.length) return;
  const picks = curateNewIn(products, 'all').slice(0, 4);
  container.innerHTML = `<div class="products">${picks.map(p =>
    cardHTML(p, { interactive: true, saved: isSlugSaved(p.slug) })
  ).join('')}</div>`;
}

/* ---------- Global Header Search ---------- */
function setupHeaderSearch() {
  const form = document.getElementById('header-search-form');
  const input = document.getElementById('header-search-input');
  const dropdown = document.getElementById('header-search-results');
  if (!form || !input || !dropdown) return;

  async function renderDropdown() {
    if (PAGE_MODE === 'catalog') {
      dropdown.hidden = true;
      return;
    }
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      dropdown.hidden = true;
      dropdown.innerHTML = '';
      return;
    }
    try {
      await ensureProductsLoaded();
    } catch {
      return;
    }
    const matches = products.filter(p =>
      `${p.brand} ${p.name} ${p.spec} ${p.category}`.toLowerCase().includes(q)
    ).slice(0, 6);

    if (!matches.length) {
      dropdown.innerHTML = `<div class="search-empty">No matches for "${esc(input.value.trim())}". <a href="/shop/?q=${encodeURIComponent(input.value.trim())}">Browse all products</a></div>`;
      dropdown.hidden = false;
      return;
    }

    dropdown.innerHTML = matches.map(p => `
      <a class="search-hit" href="/p/${p.slug}/" onclick="event.preventDefault();openModalBySlug('${esc(p.slug)}')">
        <span class="search-hit-thumb">${imgTag(p)}</span>
        <span class="search-hit-body">
          <strong>${esc(fullName(p))}</strong>
          <span>${esc(p.spec)}</span>
        </span>
        <span class="search-hit-price">${formatPrice(p.price)}</span>
      </a>
    `).join('') + `<a class="search-view-all" href="/shop/?q=${encodeURIComponent(input.value.trim())}">View all matches in Shop →</a>`;
    dropdown.hidden = false;
  }

  input.addEventListener('input', () => {
    if (PAGE_MODE === 'catalog') {
      applyCatalogFilters();
    } else {
      renderDropdown();
    }
  });

  input.addEventListener('focus', () => {
    if (PAGE_MODE !== 'catalog') renderDropdown();
  });

  form.addEventListener('submit', (e) => {
    if (PAGE_MODE === 'catalog') {
      e.preventDefault();
      applyCatalogFilters();
      const target = document.getElementById('product-grid');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#header-search-form')) {
      dropdown.hidden = true;
    }
  });
}

/* ---------- Catalog (/shop/, /new-in/, /deals/, & Category Pages) ---------- */
function populateBrandFilter(cat, selectedBrand) {
  const select = document.getElementById('brand-filter');
  if (!select) return;
  const currentVal = selectedBrand || select.value;
  const source = cat === 'all' ? products : products.filter(p => p.category === cat);
  const brands = Array.from(new Set(source.map(p => p.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  select.innerHTML = '<option value="all">All brands</option>' +
    brands.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');

  if (currentVal && currentVal !== 'all') {
    const matched = brands.find(b => b.toLowerCase() === currentVal.toLowerCase());
    if (matched) select.value = matched;
  }
}

function getBaseCollectionList() {
  if (COLLECTION_MODE === 'new') return curateNewIn(products, currentCat);
  if (COLLECTION_MODE === 'deals') return curateDeals(products, currentCat);
  const subset = currentCat === 'all' ? [...products] : products.filter(p => p.category === currentCat);
  return sortPhotoFirst(subset);
}

function getFilteredCatalog() {
  const searchEl = document.getElementById('header-search-input');
  const brandEl = document.getElementById('brand-filter');
  const priceEl = document.getElementById('price-filter');
  const stockEl = document.getElementById('stock-filter');
  const sortEl = document.getElementById('sort-select');

  const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const brand = brandEl ? brandEl.value : 'all';
  const priceRange = priceEl ? priceEl.value : 'all';
  const onlyInStock = stockEl ? stockEl.checked : false;
  const sortVal = sortEl ? sortEl.value : 'default';

  let list = getBaseCollectionList();

  if (q) {
    list = list.filter(p => `${p.brand} ${p.name} ${p.spec} ${p.category}`.toLowerCase().includes(q));
  }
  if (brand && brand !== 'all') {
    list = list.filter(p => (p.brand || '').toLowerCase() === brand.toLowerCase());
  }
  if (priceRange && priceRange !== 'all') {
    list = list.filter(p => matchesPriceTier(p.price, priceRange));
  }
  if (onlyInStock) {
    list = list.filter(p => inStock(p));
  }

  if (sortVal === 'price-asc') list.sort((a, b) => Number(a.price) - Number(b.price));
  else if (sortVal === 'price-desc') list.sort((a, b) => Number(b.price) - Number(a.price));
  else if (sortVal === 'name') list.sort((a, b) => fullName(a).localeCompare(fullName(b)));

  return list;
}

function syncClearFiltersButton() {
  const btn = document.getElementById('clear-filters-btn');
  if (!btn) return;
  const q = (document.getElementById('header-search-input')?.value || '').trim();
  const brand = document.getElementById('brand-filter')?.value || 'all';
  const price = document.getElementById('price-filter')?.value || 'all';
  const stock = document.getElementById('stock-filter')?.checked || false;
  const hasFilters = Boolean(q || brand !== 'all' || price !== 'all' || stock || currentCat !== INITIAL_CAT);
  btn.hidden = !hasFilters;
}

function syncShopUrlParams() {
  const path = window.location.pathname;
  const isCollection = path.indexOf('/new-in') === 0 || path.indexOf('/deals') === 0;
  if (path.indexOf('/shop') !== 0 && !isCollection) return;
  const params = new URLSearchParams();
  const q = (document.getElementById('header-search-input')?.value || '').trim();
  const brand = document.getElementById('brand-filter')?.value || 'all';
  const price = document.getElementById('price-filter')?.value || 'all';
  if (q) params.set('q', q);
  if (currentCat && currentCat !== 'all') params.set('cat', currentCat);
  if (!isCollection) {
    if (brand && brand !== 'all') params.set('brand', brand);
    if (price && price !== 'all') params.set('price', price);
  }
  if (currentPage > 1) params.set('page', String(currentPage));
  const qs = params.toString();
  const nextUrl = path + (qs ? '?' + qs : '');
  window.history.replaceState(null, '', nextUrl);
}

function clearCatalogFilters() {
  const searchEl = document.getElementById('header-search-input');
  const brandEl = document.getElementById('brand-filter');
  const priceEl = document.getElementById('price-filter');
  const stockEl = document.getElementById('stock-filter');
  const sortEl = document.getElementById('sort-select');
  if (searchEl) searchEl.value = '';
  if (brandEl) brandEl.value = 'all';
  if (priceEl) priceEl.value = 'all';
  if (stockEl) stockEl.checked = false;
  if (sortEl) sortEl.value = 'default';
  if (COLLECTION_MODE) {
    filterCollectionCat(INITIAL_CAT, null);
  } else {
    filterCat(INITIAL_CAT, null);
  }
}

function buildPageTokens(current, total) {
  if (total <= 7) {
    const out = [];
    for (let i = 1; i <= total; i++) out.push(i);
    return out;
  }
  if (current <= 4) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function renderPagination() {
  const nav = document.getElementById('pagination');
  if (!nav) return;
  const totalPages = Math.ceil(filteredCatalogList.length / PAGE_SIZE);
  if (totalPages <= 1) {
    nav.hidden = true;
    nav.innerHTML = '';
    return;
  }
  if (currentPage > totalPages) currentPage = totalPages;

  const tokens = buildPageTokens(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const prevBtn = `<button type="button" class="page-arrow" ${prevDisabled ? 'disabled' : `onclick="goToPage(${currentPage - 1})"`} aria-label="Previous page">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
  </button>`;

  const nextBtn = `<button type="button" class="page-arrow" ${nextDisabled ? 'disabled' : `onclick="goToPage(${currentPage + 1})"`} aria-label="Next page">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
  </button>`;

  const pageEls = tokens.map(tok => {
    if (tok === '...') return `<span class="page-ellipsis" aria-hidden="true">...</span>`;
    const active = tok === currentPage;
    return `<button type="button" class="page-num ${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''} onclick="goToPage(${tok})">${tok}</button>`;
  }).join('');

  nav.innerHTML = prevBtn + pageEls + nextBtn;
  nav.hidden = false;
}

function goToPage(page) {
  const totalPages = Math.max(1, Math.ceil(filteredCatalogList.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, page), totalPages);
  syncShopUrlParams();
  renderCatalogGrid();
  const topEl = document.getElementById('shop');
  if (topEl) topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCatalogGrid() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  syncClearFiltersButton();

  if (filteredCatalogList.length === 0) {
    grid.innerHTML = `<div class="error-state"><p>No matching products found. <button type="button" class="link-reset" onclick="clearCatalogFilters()">Clear filters</button></p></div>`;
    renderPagination();
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filteredCatalogList.slice(start, start + PAGE_SIZE);
  grid.innerHTML = `<div class="products">${slice.map(p =>
    cardHTML(p, { interactive: true, saved: isSlugSaved(p.slug) })
  ).join('')}</div>`;
  renderPagination();
}

function applyCatalogFilters(preservePage) {
  if (!preservePage) currentPage = 1;
  filteredCatalogList = getFilteredCatalog();
  syncShopUrlParams();
  renderCatalogGrid();
}

function filterCollectionCat(cat, el) {
  currentCat = cat;
  document.querySelectorAll('#collection-pills .collection-pill').forEach(p => {
    p.classList.toggle('active', p === el || p.dataset.cat === cat);
  });
  applyCatalogFilters(false);
}

function filterCat(cat, el) {
  currentCat = cat;
  if (el) {
    document.querySelectorAll('#chip-row .chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  } else {
    document.querySelectorAll('#chip-row .chip').forEach(c => {
      c.classList.toggle('active',
        (cat === 'all' && c.textContent.trim() === 'All items') ||
        (c.getAttribute('onclick') || '').includes(`'${cat}'`)
      );
    });
  }
  populateBrandFilter(cat);
  applyCatalogFilters(false);
}

/* ---------- Cart & Saved Items (persisted in localStorage) ---------- */
function toggleSaveBySlug(slug, btn) {
  const already = isSlugSaved(slug);
  if (already) {
    savedItems = savedItems.filter(item => item.slug !== slug);
    if (btn) {
      btn.textContent = '🤍';
      btn.classList.remove('active');
      btn.setAttribute('aria-label', 'Save item');
    }
    showToast('Removed from saved items');
  } else {
    const p = findProduct(slug);
    if (!p) return;
    savedItems.push(toSavedSnapshot(p));
    if (btn) {
      btn.textContent = '❤️';
      btn.classList.add('active');
      btn.setAttribute('aria-label', 'Remove from saved items');
    }
    showToast('Saved! View in cart →');
  }
  persistSavedItems();
  updateCartBadge();
  updateCartSheet();
  syncPDPSaveButton();
}

function toggleSaveFromPDP(btn) {
  try {
    const raw = btn.getAttribute('data-product');
    const snapshot = raw ? JSON.parse(raw) : null;
    if (!snapshot || !snapshot.slug) return;
    if (isSlugSaved(snapshot.slug)) {
      savedItems = savedItems.filter(item => item.slug !== snapshot.slug);
      showToast('Removed from saved items');
    } else {
      savedItems.push(toSavedSnapshot(snapshot));
      showToast('Saved! View in cart →');
    }
    persistSavedItems();
    updateCartBadge();
    updateCartSheet();
    syncPDPSaveButton();
  } catch {
    // Ignore malformed payload
  }
}

function syncPDPSaveButton() {
  const btn = document.getElementById('pdp-save-btn');
  const slug = document.body.dataset.slug;
  if (!btn || !slug) return;
  const saved = isSlugSaved(slug);
  btn.textContent = saved ? 'Saved in cart ✓' : 'Save item';
  btn.classList.toggle('is-saved', saved);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = savedItems.reduce((sum, item) => sum + (item.qty || 1), 0);
  badge.textContent = count;
  badge.classList.toggle('visible', count > 0);
}

function updateCartQty(slug, delta) {
  const item = savedItems.find(entry => entry.slug === slug);
  if (!item) return;
  const nextQty = (item.qty || 1) + delta;
  if (nextQty <= 0) {
    toggleSaveFromCart(slug);
    return;
  }
  item.qty = nextQty;
  persistSavedItems();
  updateCartBadge();
  updateCartSheet();
}

function updateCartSheet() {
  const container = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  if (!container || !footer) return;
  if (savedItems.length === 0) {
    container.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>No saved items yet.<br>Tap 🤍 on a product to save it.</p></div>`;
    footer.style.display = 'none';
    return;
  }
  footer.style.display = 'block';
  let total = 0;
  container.innerHTML = savedItems.map(p => {
    const qty = p.qty || 1;
    const unitPrice = Number(p.price) || 0;
    const lineTotal = unitPrice * qty;
    total += lineTotal;
    const nameLabel = fullName(p);
    return `<div class="cart-item">
      <a class="ci-icon" href="/p/${p.slug}/">${imgTag(p)}</a>
      <div class="ci-info">
        <a class="ci-name" href="/p/${p.slug}/">${esc(nameLabel)}</a>
        <div class="ci-price">${formatPrice(unitPrice)}${qty > 1 ? ` × ${qty} = ${formatPrice(lineTotal)}` : ''}</div>
        <div class="ci-qty">
          <button type="button" class="ci-qty-btn" aria-label="Decrease quantity of ${esc(nameLabel)}" onclick="updateCartQty('${esc(p.slug)}', -1)">−</button>
          <span class="ci-qty-val">${qty}</span>
          <button type="button" class="ci-qty-btn" aria-label="Increase quantity of ${esc(nameLabel)}" onclick="updateCartQty('${esc(p.slug)}', 1)">+</button>
        </div>
      </div>
      <button type="button" class="ci-remove" aria-label="Remove ${esc(nameLabel)}" onclick="toggleSaveFromCart('${esc(p.slug)}')">✕</button>
    </div>`;
  }).join('');
  document.getElementById('cart-total').textContent = formatPrice(total);
}

function toggleSaveFromCart(slug) {
  savedItems = savedItems.filter(item => item.slug !== slug);
  persistSavedItems();
  updateCartBadge();
  updateCartSheet();
  syncPDPSaveButton();
  if (PAGE_MODE === 'home' && products.length) {
    selectHomeBrand(activeHomeBrand, null);
    hydrateHomeNewIn();
  } else if (PAGE_MODE === 'catalog' && products.length) {
    renderCatalogGrid();
  }
}

function toggleCart() {
  const sheet = document.getElementById('cart-sheet');
  const overlay = document.getElementById('cart-overlay');
  if (!sheet || !overlay) return;
  updateCartSheet();
  sheet.classList.toggle('open');
  overlay.classList.toggle('open');
}

function orderCartOnWA() {
  if (!savedItems.length) return;
  openWA(cartOrderMessage(savedItems));
}

function getCurrentPDPProduct() {
  if (PAGE_MODE !== 'product') return null;
  const btn = document.getElementById('pdp-save-btn');
  const raw = btn ? btn.getAttribute('data-product') : '';
  if (!raw) return null;
  try {
    const snapshot = JSON.parse(raw);
    return snapshot && snapshot.slug ? snapshot : null;
  } catch {
    return null;
  }
}

function openHeaderWA() {
  const pdpProduct = getCurrentPDPProduct();
  if (pdpProduct) {
    openWA(orderMessage(pdpProduct));
    return;
  }
  if (savedItems.length > 0) {
    openWA(cartOrderMessage(savedItems));
    return;
  }
  openWA('Hi TechStore! I\'m browsing TechStore and would like help confirming stock and Kampala delivery.');
}

function orderWABySlug(slug) {
  const p = findProduct(slug);
  if (p) openWA(orderMessage(p));
}

function openWA(msg) {
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}

/* ---------- Modal ---------- */
function openModalBySlug(slug) {
  const p = findProduct(slug);
  if (!p) return;
  const pct = savings(p);
  const available = inStock(p);
  const saved = isSlugSaved(p.slug);
  const brandLabel = displayBrand(p);
  const titleLabel = displayTitle(p);
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-split">
      <div class="modal-media-col">
        <div class="modal-img">${imgTag(p, '', 600)}</div>
      </div>
      <div class="modal-details">
        ${brandLabel ? `<div class="modal-brand">${esc(brandLabel)}</div>` : ''}
        <div class="modal-name">${esc(titleLabel)}</div>
        ${p.spec ? `<div class="modal-spec">${esc(p.spec)}</div>` : ''}
        ${available
          ? '<div class="modal-stock-line is-in">In stock · Ready for same-day Kampala delivery</div>'
          : '<div class="pdp-stock">Currently out of stock – message us on WhatsApp for restock dates.</div>'}
        <div class="modal-price-row">
          <div>
            <div class="modal-price">${formatPrice(p.price)}</div>
            ${p.old_price ? `<div class="modal-old">${formatPrice(p.old_price)}</div>` : ''}
          </div>
          ${pct ? `<div class="modal-save">You save ${pct}%</div>` : ''}
        </div>
        ${trustItemsHTML(p)}
        <div class="pdp-actions">
          <button type="button" class="modal-order-btn" onclick="orderWABySlug('${esc(p.slug)}')">
            ${waIcon(18)}
            Order on WhatsApp
          </button>
          <button type="button" class="pdp-save-btn ${saved ? 'is-saved' : ''}" onclick="toggleSaveBySlug('${esc(p.slug)}');this.textContent=isSlugSaved('${esc(p.slug)}')?'Saved in cart ✓':'Save item';this.classList.toggle('is-saved',isSlugSaved('${esc(p.slug)}'))">
            ${saved ? 'Saved in cart ✓' : 'Save item'}
          </button>
        </div>
        <a class="modal-more" href="/p/${p.slug}/">View full specifications &amp; details →</a>
      </div>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(null);
    closeCatMenu();
  }
});

function scrollToShop() {
  const el = document.getElementById('shop');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

let mobOpen = false;
function toggleMob() {
  mobOpen = !mobOpen;
  const drawer = document.getElementById('mob-drawer');
  if (!drawer) return;
  if (mobOpen) {
    drawer.style.display = 'flex';
    requestAnimationFrame(() => drawer.classList.add('open'));
  } else {
    drawer.classList.remove('open');
    setTimeout(() => { drawer.style.display = 'none'; }, 250);
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Boot ---------- */
async function loadProducts() {
  updateCartBadge();
  syncPDPSaveButton();
  setupHeaderSearch();

  if (PAGE_MODE === 'product') return;

  try {
    await ensureProductsLoaded();

    if (PAGE_MODE === 'home') {
      renderHeroBento();
      selectHomeBrand(activeHomeBrand, null);
      hydrateHomeNewIn();
    } else {
      const params = new URLSearchParams(window.location.search);
      const qParam = params.get('q');
      const catParam = params.get('cat');
      const brandParam = params.get('brand');
      const priceParam = params.get('price');
      const pageParam = parseInt(params.get('page') || '1', 10);

      const searchEl = document.getElementById('header-search-input');
      const priceEl = document.getElementById('price-filter');
      if (qParam && searchEl) searchEl.value = qParam;
      if (priceParam && priceEl) {
        const hasOption = Array.from(priceEl.options).some(opt => opt.value === priceParam);
        if (hasOption) priceEl.value = priceParam;
      }

      const activeCat = (catParam && CAT_LABELS[catParam]) ? catParam : INITIAL_CAT;
      currentCat = activeCat;
      if (COLLECTION_MODE) {
        document.querySelectorAll('#collection-pills .collection-pill').forEach(p => {
          p.classList.toggle('active', p.dataset.cat === activeCat);
        });
      } else {
        document.querySelectorAll('#chip-row .chip').forEach(c => {
          c.classList.toggle('active',
            (activeCat === 'all' && c.textContent.trim() === 'All items') ||
            (c.getAttribute('onclick') || '').includes(`'${activeCat}'`)
          );
        });
        populateBrandFilter(activeCat, brandParam || 'all');
      }

      currentPage = isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
      applyCatalogFilters(true);
    }
  } catch (e) {
    if (PAGE_MODE === 'catalog') {
      const grid = document.getElementById('product-grid');
      if (grid && !grid.querySelector('.products')) {
        grid.innerHTML = `<div class="error-state"><p>Could not load products. Check your internet connection and try refreshing.</p></div>`;
      }
    }
  }
}

loadProducts();
