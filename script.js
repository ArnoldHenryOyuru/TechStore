const WA = '256750533222';
const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTf_4ROfEofmZST8sC1b4XaDVF8RIddYuS2vaPDgcrxYlsrYvegbit_llsaZcWVvFv7w92tDAqO5Kof/pub?gid=213782715&single=true&output=csv';

const CAT_ICONS = {phones:'📱',laptops:'💻',audio:'🎧',accessories:'🔌',gaming:'🎮',wearables:'⌚'};

let products = [];
let currentCat = 'all';
let savedItems = [];
let currentList = [];

// Parse CSV text into array of objects
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue; }
      cur += line[i];
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = (vals[i] || '').replace(/^"|"$/g,'').trim());
    return obj;
  }).filter(r => r.name && r.category);
}

// Convert Google Drive share link to direct image URL
function driveUrl(url) {
  if (!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
  return url;
}

function imgTag(url, cat, cls='') {
  const src = driveUrl(url);
  const icon = CAT_ICONS[cat] || '📦';
  if (src) {
    return `<img src="${src}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" class="${cls}"><span class="emoji-fallback" style="display:none">${icon}</span>`;
  }
  return `<span class="emoji-fallback">${icon}</span>`;
}

function formatPrice(n) {
  return 'UGX ' + Number(n).toLocaleString();
}

function savings(p) {
  if (!p.old_price || !p.price) return null;
  return Math.round((1 - Number(p.price) / Number(p.old_price)) * 100);
}

let spotlightItems = [];
let spotlightIdx = 0;
let spotlightTimer = null;

function buildSpotlightItems() {
  const featured = products.filter(p => p.badge === 'hot' || p.badge === 'new' || p.badge === 'sale');
  spotlightItems = (featured.length >= 3 ? featured : products).slice(0, 8);
}

function renderSpotlight() {
  buildSpotlightItems();
  if (spotlightItems.length === 0) {
    document.getElementById('spotlight').style.display = 'none';
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
        <h2 class="spot-name">${p.brand} ${p.name}</h2>
        <p class="spot-spec">${p.spec || ''}</p>
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
      <div class="spot-img">${imgTag(p.image_url, p.category)}</div>
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
    renderProducts(products);
    renderHeroCards();
    renderSpotlight();
  } catch (e) {
    document.getElementById('product-grid').innerHTML = `<div class="error-state"><div style="font-size:2rem">⚠️</div><p>Could not load products. Check your internet connection and try refreshing.</p></div>`;
    document.getElementById('hero-cards').innerHTML = '';
  }
}

function renderHeroCards() {
  const top = products.filter(p => p.badge === 'hot' || p.badge === 'new' || p.badge === 'sale').slice(0, 3);
  const show = top.length >= 3 ? top : products.slice(0, 3);
  document.getElementById('hero-cards').innerHTML = show.map((p) => `
    <div class="feat-card" onclick="openModal(${products.indexOf(p)})">
      <div class="feat-icon">${imgTag(p.image_url, p.category)}</div>
      <div class="feat-info">
        <div class="feat-name">${p.brand} ${p.name}</div>
        <div class="feat-price">${formatPrice(p.price)}</div>
      </div>
      ${p.badge ? `<div class="feat-badge ${p.badge}">${p.badge}</div>` : ''}
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
    const saved = savedItems.includes(idx);
    const pct = savings(p);
    return `
    <div class="card" onclick="openModal(${idx})">
      <div class="card-img">
        ${p.badge ? `<div class="badge ${p.badge}">${p.badge}</div>` : ''}
        <button class="wish-btn ${saved?'active':''}" onclick="event.stopPropagation();toggleSave(${idx},this)">${saved?'❤️':'🤍'}</button>
        ${imgTag(p.image_url, p.category)}
      </div>
      <div class="card-body">
        <div class="card-brand">${p.brand}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-spec">${p.spec}</div>
        <div class="card-footer">
          <div class="price-wrap">
            <span class="price">${formatPrice(p.price)}</span>
            ${p.old_price ? `<span class="old-price">${formatPrice(p.old_price)}</span>` : ''}
            ${pct ? `<span class="savings">Save ${pct}%</span>` : ''}
          </div>
          <button class="order-btn" onclick="event.stopPropagation();orderWA(${idx})">
            <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.523 5.847L.057 23.03a1 1 0 001.23 1.23l5.183-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.793-.5-5.39-1.376l-.383-.216-3.973 1.124 1.124-3.973-.216-.383A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Order
          </button>
        </div>
      </div>
    </div>`;
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
      <div class="ci-icon">${imgTag(p.image_url, p.category)}</div>
      <div class="ci-info">
        <div class="ci-name">${p.brand} ${p.name}</div>
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
  const p = products[idx];
  openWA(`Hi TechStore! I'd like to order the *${p.brand} ${p.name}* (${p.spec}) priced at ${formatPrice(p.price)}. Please confirm availability and delivery details. Thank you!`);
}

function openWA(msg) {
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
}

function openModal(idx) {
  const p = products[idx];
  const pct = savings(p);
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-img">${imgTag(p.image_url, p.category)}</div>
    <div class="modal-brand">${p.brand}</div>
    <div class="modal-name">${p.name}</div>
    <div class="modal-spec">${p.spec}</div>
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.523 5.847L.057 23.03a1 1 0 001.23 1.23l5.183-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.793-.5-5.39-1.376l-.383-.216-3.973 1.124 1.124-3.973-.216-.383A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
      Order on WhatsApp
    </button>`;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

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
