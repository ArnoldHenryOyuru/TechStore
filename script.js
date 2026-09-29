// Shared helpers (CSV parsing, slugs, card markup) live in ts-shared.js so the
// prerendered pages made by build.js and the live page always match.
const { WA, SHEET_CSV, parseCSV, imgTag, formatPrice, savings, esc, cardHTML, waIcon, orderMessage } = TS;

// Category pages (/phones/ etc.) set <body data-cat="phones">
const INITIAL_CAT = document.body.dataset.cat || 'all';

let products = [];
let currentCat = 'all';
let savedItems = [];
let currentList = [];

let spotlightItems = [];
let spotlightIdx = 0;
let spotlightTimer = null;

function buildSpotlightItems() {
  const featured = products.filter(p => p.badge === 'hot' || p.badge === 'new' || p.badge === 'sale');
  spotlightItems = (featured.length >= 3 ? featured : products).slice(0, 8);
}

function renderSpotlight() {
  const box = document.getElementById('spotlight');
  if (!box) return; // not on this page (category pages have no spotlight)
  buildSpotlightItems();
  if (spotlightItems.length === 0) {
    box.style.display = 'none';
    return;
  }
  spotlightIdx = 0;
  renderSpotlightSlide();
  renderSpotlightDots();
  startSpotlightAuto();
}

function renderSpotlightSlide() {
  const p = spotlightItems[spotlightIdx];
  const idx = products.indexOf(p);
  const pct = savings(p);
  document.getElementById('spot-inner').innerHTML = `
    <div class="spot-slide">
      <div class="spot-label">FEATURED&nbsp;PICKS</div>
      <div class="spot-text">
        <h2 class="spot-name">${esc(p.brand)} ${esc(p.name)}</h2>
        <p class="spot-spec">${esc(p.spec)}</p>
        <div class="spot-price-row">
          <span class="spot-price">${formatPrice(p.price)}</span>
          ${p.old_price ? `<span class="spot-old-price">${formatPrice(p.old_price)}</span>` : ''}
          ${pct ? `<span class="spot-save">Save ${pct}%</span>` : ''}
        </div>
        <div class="spot-btns">
          <button class="spot-btn-primary" onclick="openModal(${idx})">View Product</button>
          <button class="spot-btn-ghost" onclick="orderWA(${idx})">Ask about this on WhatsApp</button>
        </div>
      </div>
      <div class="spot-img">${imgTag(p)}</div>
    </div>`;
  document.querySelectorAll('.spot-dot').forEach((d, i) => d.classList.toggle('active', i === spotlightIdx));
}

function renderSpotlightDots() {
  document.getElementById('spot-dots').innerHTML = spotlightItems.map((_, i) =>
    `<button class="spot-dot ${i === spotlightIdx ? 'active' : ''}" onclick="goToSpotlight(${i})" aria-label="Go to slide ${i + 1}"></button>`
  ).join('');
}

function goToSpotlight(i) {
  spotlightIdx = i;
  renderSpotlightSlide();
  restartSpotlightAuto();
}

function spotlightNext() {
  spotlightIdx = (spotlightIdx + 1) % spotlightItems.length;
  renderSpotlightSlide();
  restartSpotlightAuto();
}

function spotlightPrev() {
  spotlightIdx = (spotlightIdx - 1 + spotlightItems.length) % spotlightItems.length;
  renderSpotlightSlide();
  restartSpotlightAuto();
}

function startSpotlightAuto() {
  if (spotlightItems.length < 2) return;
  spotlightTimer = setInterval(spotlightNext, 6000);
}

function restartSpotlightAuto() {
  if (spotlightTimer) clearInterval(spotlightTimer);
  startSpotlightAuto();
}

async function loadProducts() {
  try {
    const res = await fetch(SHEET_CSV);
    if (!res.ok) throw new Error('fetch failed');
    const text = await res.text();
    products = parseCSV(text);
    currentList = [...products];
    if (INITIAL_CAT !== 'all') filterCat(INITIAL_CAT, null);
    else renderProducts(products);
    renderHeroCards();
    renderSpotlight();
  } catch (e) {
    // If the prerendered products are already on the page, keep them instead of showing an error.
    if (!document.querySelector('#product-grid .products')) {
      document.getElementById('product-grid').innerHTML = `<div class="error-state"><div style="font-size:2rem">⚠️</div><p>Could not load products. Check your internet connection and try refreshing.</p></div>`;
    }
    const hc = document.getElementById('hero-cards');
    if (hc) hc.innerHTML = '';
  }
}

function renderHeroCards() {
  const el = document.getElementById('hero-cards');
  if (!el) return; // not on this page
  const top = products.filter(p => p.badge === 'hot' || p.badge === 'new' || p.badge === 'sale').slice(0, 3);
  const show = top.length >= 3 ? top : products.slice(0, 3);
  el.innerHTML = show.map((p) => `
    <div class="feat-card" onclick="openModal(${products.indexOf(p)})">
      <div class="feat-icon">${imgTag(p)}</div>
      <div class="feat-info">
        <div class="feat-name">${esc(p.brand)} ${esc(p.name)}</div>
        <div class="feat-price">${formatPrice(p.price)}</div>
      </div>
      ${p.badge ? `<div class="feat-badge ${esc(p.badge)}">${esc(p.badge)}</div>` : ''}
    </div>`).join('');
}

function renderProducts(list) {
  currentList = list;
  document.getElementById('count').textContent = list.length;
  const grid = document.getElementById('product-grid');
  if (list.length === 0) {
    grid.innerHTML = `<div class="error-state"><div style="font-size:2rem">🔍</div><p>No products in this category yet.</p></div>`;
    return;
  }
  grid.innerHTML = `<div class="products">${list.map((p) => {
    const idx = products.indexOf(p);
    return cardHTML(p, { interactive: true, idx, saved: savedItems.includes(idx) });
  }).join('')}</div>`;
}

function filterCat(cat, el) {
  currentCat = cat;
  if (el) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  } else {
    document.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active',
        (cat === 'all' && c.textContent.trim() === 'All items') ||
        (c.getAttribute('onclick') || '').includes(`'${cat}'`)
      );
    });
  }
  const labels = {all:'All products',phones:'Phones',laptops:'Laptops',audio:'Audio & Headphones',accessories:'Accessories',gaming:'Gaming',wearables:'Wearables'};
  document.getElementById('cat-label').textContent = labels[cat] || cat;
  const list = cat === 'all' ? [...products] : products.filter(p => p.category === cat);
  renderProducts(list);
}

function applySort() {
  const val = document.getElementById('sort-select').value;
  let list = currentCat === 'all' ? [...products] : products.filter(p => p.category === currentCat);
  if (val === 'price-asc') list.sort((a,b) => Number(a.price) - Number(b.price));
  else if (val === 'price-desc') list.sort((a,b) => Number(b.price) - Number(a.price));
  else if (val === 'name') list.sort((a,b) => a.name.localeCompare(b.name));
  renderProducts(list);
}

function toggleSave(idx, btn) {
  const already = savedItems.includes(idx);
  if (already) {
    savedItems = savedItems.filter(i => i !== idx);
    btn.textContent = '🤍';
    btn.classList.remove('active');
    showToast('Removed from saved items');
  } else {
    savedItems.push(idx);
    btn.textContent = '❤️';
    btn.classList.add('active');
    showToast('Saved! View in cart →');
  }
  updateCartBadge();
  updateCartSheet();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  badge.textContent = savedItems.length;
  badge.classList.toggle('visible', savedItems.length > 0);
}

function updateCartSheet() {
  const container = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  if (savedItems.length === 0) {
    container.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>No saved items yet.<br>Tap 🤍 on a product to save it.</p></div>`;
    footer.style.display = 'none';
    return;
  }
  footer.style.display = 'block';
  let total = 0;
  container.innerHTML = savedItems.map(idx => {
    const p = products[idx];
    total += Number(p.price);
    return `<div class="cart-item">
      <div class="ci-icon">${imgTag(p)}</div>
      <div class="ci-info">
        <div class="ci-name">${esc(p.brand)} ${esc(p.name)}</div>
        <div class="ci-price">${formatPrice(p.price)}</div>
      </div>
      <button class="ci-remove" onclick="toggleSaveFromCart(${idx})">✕</button>
    </div>`;
  }).join('');
  document.getElementById('cart-total').textContent = formatPrice(total);
}

function toggleSaveFromCart(idx) {
  savedItems = savedItems.filter(i => i !== idx);
  updateCartBadge();
  updateCartSheet();
  renderProducts(currentCat === 'all' ? [...products] : products.filter(p => p.category === currentCat));
}

function toggleCart() {
  const sheet = document.getElementById('cart-sheet');
  const overlay = document.getElementById('cart-overlay');
  updateCartSheet();
  sheet.classList.toggle('open');
  overlay.classList.toggle('open');
}

function orderCartOnWA() {
  const items = savedItems.map(i => products[i]);
  const lines = items.map(p => `• ${p.brand} ${p.name} — ${formatPrice(p.price)}`).join('\n');
  const total = items.reduce((s,p) => s + Number(p.price), 0);
  openWA(`Hi TechStore! I'd like to order:\n\n${lines}\n\nTotal: ${formatPrice(total)}\n\nPlease confirm availability and delivery. Thank you!`);
}

function orderWA(idx) {
  openWA(orderMessage(products[idx]));
}

function openWA(msg) {
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
}

function openModal(idx) {
  const p = products[idx];
  const pct = savings(p);
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-img">${imgTag(p)}</div>
    <div class="modal-brand">${esc(p.brand)}</div>
    <div class="modal-name">${esc(p.name)}</div>
    <div class="modal-spec">${esc(p.spec)}</div>
    <div class="modal-price-row">
      <div>
        <div class="modal-price">${formatPrice(p.price)}</div>
        ${p.old_price ? `<div class="modal-old">${formatPrice(p.old_price)}</div>` : ''}
      </div>
      ${pct ? `<div class="modal-save">You save ${pct}%</div>` : ''}
    </div>
    <div class="modal-badges">
      ${p.category === 'phones' ? `<div class="modal-badge-item">🆕 <span>Brand New</span></div>
      <div class="modal-badge-item">🔎 <span>IMEI Verified</span></div>` : `<div class="modal-badge-item">✅ <span>Genuine</span></div>`}
      <div class="modal-badge-item">🚚 <span>Same-day delivery</span></div>
      <div class="modal-badge-item">📱 <span>Mobile Money</span></div>
      <div class="modal-badge-item">🔄 <span>7-day returns</span></div>
    </div>
    <button class="modal-order-btn" onclick="orderWA(${idx})">
      ${waIcon(18)}
      Order on WhatsApp
    </button>
    <a class="modal-more" href="/p/${p.slug}/">View full details page →</a>`;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal(null);
});

function scrollToShop() {
  document.getElementById('shop').scrollIntoView({behavior:'smooth'});
}

let mobOpen = false;
function toggleMob() {
  mobOpen = !mobOpen;
  const drawer = document.getElementById('mob-drawer');
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
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

loadProducts();
