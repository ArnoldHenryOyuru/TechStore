*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#f5f5f7;--surface:#ffffff;--surface2:#f0f0f2;--surface3:#e8e8ed;
  --accent:#f5a623;--accent-dark:#d4881a;--accent2:#ff6b35;
  --text:#1d1d1f;--text2:#3d3d3f;--muted:#6e6e73;--muted2:#aeaeb2;
  --border:#d2d2d7;--border-light:#e8e8ed;
  --green:#34c759;--green-bg:rgba(52,199,89,0.1);
  --red:#ff3b30;--blue:#007aff;
  --shadow-sm:0 1px 3px rgba(0,0,0,0.08);
  --shadow-md:0 4px 16px rgba(0,0,0,0.10);
  --shadow-lg:0 12px 40px rgba(0,0,0,0.14);
  --r:14px;--r-sm:10px;--r-xs:8px;
  --font:'DM Sans',-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;
}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}

/* NAV */
nav{position:sticky;top:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:56px;background:rgba(245,245,247,0.82);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid rgba(210,210,215,0.6)}
.logo{font-size:1.15rem;font-weight:700;letter-spacing:-0.03em;color:var(--text);text-decoration:none;display:flex;align-items:center;gap:6px}
.logo-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block}
.nav-links{display:flex;list-style:none}
.nav-links a{font-size:0.82rem;font-weight:500;color:var(--muted);text-decoration:none;padding:0.45rem 1rem;border-radius:6px;transition:color 0.15s,background 0.15s;letter-spacing:-0.01em}
.nav-links a:hover{color:var(--text);background:rgba(0,0,0,0.04)}
.nav-right{display:flex;align-items:center;gap:10px}
.cart-btn{background:none;border:none;cursor:pointer;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;color:var(--text);transition:background 0.15s;position:relative}
.cart-btn:hover{background:rgba(0,0,0,0.06)}
.cart-badge{position:absolute;top:4px;right:4px;width:14px;height:14px;border-radius:50%;background:var(--accent);font-size:0.6rem;font-weight:700;color:#fff;display:none;align-items:center;justify-content:center}
.cart-badge.visible{display:flex}
.wa-nav-btn{background:var(--green);color:#fff;border:none;padding:0.45rem 1.1rem;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer;font-family:var(--font);display:flex;align-items:center;gap:6px;transition:background 0.15s,transform 0.1s;letter-spacing:-0.01em}
.wa-nav-btn:hover{background:#2db34a;transform:scale(0.97)}
.hamburger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:6px}
.hamburger span{display:block;width:20px;height:2px;background:var(--text);border-radius:2px;transition:all 0.25s}

/* MOBILE DRAWER */
.mob-drawer{display:none;position:fixed;top:56px;left:0;right:0;bottom:0;z-index:190;background:rgba(245,245,247,0.97);backdrop-filter:blur(20px);flex-direction:column;padding:1.5rem 1.5rem 2rem;transform:translateY(-8px);opacity:0;transition:opacity 0.25s,transform 0.25s;pointer-events:none}
.mob-drawer.open{opacity:1;transform:translateY(0);pointer-events:all;display:flex}
.mob-drawer a{font-size:1.3rem;font-weight:600;color:var(--text);text-decoration:none;padding:1rem 0;border-bottom:1px solid var(--border-light);letter-spacing:-0.03em}
.mob-wa-btn{margin-top:1.5rem;background:var(--green);color:#fff;border:none;padding:1rem;border-radius:var(--r);font-size:1rem;font-weight:600;cursor:pointer;font-family:var(--font);width:100%}

/* HERO */
.hero{max-width:1100px;margin:0 auto;padding:3.5rem 2rem 2rem;display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:center}
.hero h1{font-size:3.4rem;font-weight:700;line-height:1.05;letter-spacing:-0.04em;color:var(--text);margin-bottom:1rem}
.hero h1 em{font-style:normal;color:var(--accent)}
.hero-sub{font-size:1rem;color:var(--muted);line-height:1.65;margin-bottom:1.8rem;max-width:420px;letter-spacing:-0.01em}
.hero-btns{display:flex;gap:10px;flex-wrap:wrap}
.btn-primary{background:var(--accent);color:#fff;border:none;padding:0.7rem 1.6rem;border-radius:var(--r-xs);font-weight:600;font-size:0.88rem;cursor:pointer;font-family:var(--font);letter-spacing:-0.01em;transition:background 0.15s,transform 0.1s;box-shadow:0 2px 8px rgba(245,166,35,0.35)}
.btn-primary:hover{background:var(--accent-dark);transform:scale(0.97)}
.btn-ghost{background:rgba(0,0,0,0.06);color:var(--text);border:none;padding:0.7rem 1.6rem;border-radius:var(--r-xs);font-weight:500;font-size:0.88rem;cursor:pointer;font-family:var(--font);letter-spacing:-0.01em;transition:background 0.15s,transform 0.1s}
.btn-ghost:hover{background:rgba(0,0,0,0.1);transform:scale(0.97)}
.hero-stats{display:flex;margin-top:2.2rem;background:var(--surface);border-radius:var(--r);border:1px solid var(--border-light);overflow:hidden;box-shadow:var(--shadow-sm)}
.stat{flex:1;padding:1rem 1.2rem;border-right:1px solid var(--border-light);text-align:center}
.stat:last-child{border-right:none}
.stat-num{font-size:1.4rem;font-weight:700;color:var(--text);letter-spacing:-0.04em;line-height:1}
.stat-label{font-size:0.7rem;color:var(--muted);margin-top:3px;letter-spacing:-0.01em}
.hero-visual{background:var(--surface);border-radius:24px;border:1px solid var(--border-light);box-shadow:var(--shadow-lg);padding:2rem;min-height:340px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden}
.hero-visual::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 80% 10%,rgba(245,166,35,0.08) 0%,transparent 60%)}
.feat-tag{font-size:0.65rem;font-weight:600;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px}
.feat-card{background:var(--bg);border-radius:var(--r-sm);border:1px solid var(--border-light);padding:0.85rem 1rem;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-sm);transition:transform 0.2s;cursor:pointer}
.feat-card:hover{transform:translateX(4px)}
.feat-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:var(--surface);border:1px solid var(--border-light);flex-shrink:0;overflow:hidden}
.feat-icon img{width:100%;height:100%;object-fit:cover;border-radius:8px}
.feat-info{flex:1}
.feat-name{font-size:0.85rem;font-weight:600;letter-spacing:-0.02em;color:var(--text)}
.feat-price{font-size:0.78rem;color:var(--accent);font-weight:600;letter-spacing:-0.01em}
.feat-badge{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:3px 7px;border-radius:4px}
.feat-badge.hot{background:rgba(255,107,53,0.12);color:var(--accent2)}
.feat-badge.new{background:rgba(0,122,255,0.1);color:var(--blue)}
.feat-badge.sale{background:rgba(255,59,48,0.1);color:var(--red)}

/* TRUST BAR */
.trust-bar{max-width:1100px;margin:0 auto;padding:0 2rem}
.trust-inner{display:grid;grid-template-columns:repeat(5,1fr);background:var(--surface);border-radius:var(--r);border:1px solid var(--border-light);box-shadow:var(--shadow-sm);overflow:hidden;margin-top:1.5rem}
.trust-item{padding:1rem 1.2rem;display:flex;align-items:center;gap:10px;border-right:1px solid var(--border-light)}
.trust-item:last-child{border-right:none}
.trust-icon{font-size:1.3rem;flex-shrink:0}
.trust-text strong{display:block;font-size:0.78rem;font-weight:600;letter-spacing:-0.01em;color:var(--text)}
.trust-text span{font-size:0.7rem;color:var(--muted);letter-spacing:-0.01em}

/* DELIVERY BANNER */
.delivery-banner{max-width:1100px;margin:0 auto;padding:0 2rem}
.delivery-banner-inner{display:flex;align-items:center;justify-content:center;gap:10px;background:var(--surface);border:1px solid var(--border-light);border-radius:var(--r);box-shadow:var(--shadow-sm);padding:0.9rem 1.4rem;margin-top:1.5rem;text-align:center}
.delivery-banner-icon{font-size:1.2rem;flex-shrink:0}
.delivery-banner-text{font-size:0.82rem;color:var(--text2);letter-spacing:-0.01em}
.delivery-banner-text strong{color:var(--text);font-weight:600}

/* SECTION */
.section{padding:2.5rem 2rem;max-width:1100px;margin:0 auto}
.section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem}
.section-title{font-size:1.1rem;font-weight:700;letter-spacing:-0.03em;color:var(--text)}

/* CHIPS */
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{background:var(--surface);border:1px solid var(--border-light);border-radius:50px;padding:0.38rem 1rem;font-size:0.78rem;font-weight:500;cursor:pointer;transition:all 0.15s;color:var(--text2);font-family:var(--font);letter-spacing:-0.01em;box-shadow:var(--shadow-sm)}
.chip:hover{border-color:var(--accent);color:var(--accent)}
.chip.active{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 2px 8px rgba(245,166,35,0.3)}

/* LIST BAR */
.list-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
.count-text{font-size:0.78rem;color:var(--muted);letter-spacing:-0.01em}
.sort-select{background:var(--surface);border:1px solid var(--border-light);border-radius:var(--r-xs);padding:0.35rem 0.8rem;font-size:0.78rem;color:var(--text2);font-family:var(--font);cursor:pointer;outline:none;box-shadow:var(--shadow-sm)}

/* LOADING STATE */
.loading-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;gap:1rem;color:var(--muted)}
.spinner{width:32px;height:32px;border:2px solid var(--border-light);border-top-color:var(--accent);border-radius:50%;animation:spin 0.7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.error-state{text-align:center;padding:3rem;background:var(--surface);border-radius:var(--r);border:1px solid var(--border-light)}
.error-state p{color:var(--muted);font-size:0.9rem;margin-top:0.5rem}

/* PRODUCT GRID */
.products{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.card{background:var(--surface);border:1px solid var(--border-light);border-radius:var(--r);overflow:hidden;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;box-shadow:var(--shadow-sm);position:relative}
.card:hover{transform:translateY(-4px);box-shadow:var(--shadow-md)}
.card-img{height:170px;display:flex;align-items:center;justify-content:center;font-size:4rem;background:var(--bg);position:relative;overflow:hidden}
.card-img img{width:100%;height:100%;object-fit:cover}
.card-img .emoji-fallback{font-size:4rem;position:absolute}
.badge{position:absolute;top:10px;left:10px;font-size:0.6rem;font-weight:700;letter-spacing:0.04em;padding:3px 8px;border-radius:5px;text-transform:uppercase;z-index:1}
.badge.new{background:rgba(0,122,255,0.1);color:var(--blue)}
.badge.hot{background:rgba(255,107,53,0.12);color:var(--accent2)}
.badge.sale{background:rgba(255,59,48,0.1);color:var(--red)}
.wish-btn{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:50%;background:var(--surface);border:1px solid var(--border-light);display:flex;align-items:center;justify-content:center;font-size:0.75rem;cursor:pointer;box-shadow:var(--shadow-sm);transition:all 0.15s;opacity:0;z-index:1}
.card:hover .wish-btn{opacity:1}
.wish-btn.active{opacity:1;color:var(--red)}
.card-body{padding:1rem}
.card-brand{font-size:0.67rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px}
.card-name{font-size:0.88rem;font-weight:600;margin-bottom:4px;line-height:1.35;letter-spacing:-0.02em;color:var(--text)}
.card-spec{font-size:0.73rem;color:var(--muted);letter-spacing:-0.01em;margin-bottom:0.75rem;line-height:1.4}
.card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px}
.price{font-weight:700;font-size:0.92rem;color:var(--text);letter-spacing:-0.02em}
.old-price{font-size:0.7rem;color:var(--muted2);text-decoration:line-through;margin-left:4px}
.savings{display:block;font-size:0.65rem;color:var(--green);font-weight:600;letter-spacing:-0.01em;margin-top:2px}
.order-btn{background:var(--green);color:#fff;border:none;padding:0.45rem 0.85rem;border-radius:var(--r-xs);font-size:0.75rem;font-weight:600;cursor:pointer;font-family:var(--font);letter-spacing:-0.01em;display:flex;align-items:center;gap:4px;transition:background 0.15s,transform 0.1s;white-space:nowrap;flex-shrink:0}
.order-btn:hover{background:#2db34a;transform:scale(0.96)}
.order-btn svg{width:13px;height:13px;fill:currentColor;flex-shrink:0}

/* MODAL */
.modal-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s}
.modal-overlay.open{opacity:1;pointer-events:all}
.modal{background:var(--surface);border-radius:24px 24px 0 0;padding:2rem;width:100%;max-width:560px;transform:translateY(24px);transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);max-height:90vh;overflow-y:auto;position:relative}
.modal-overlay.open .modal{transform:translateY(0)}
.modal-pill{width:36px;height:4px;border-radius:2px;background:var(--border);margin:0 auto 1.5rem}
.modal-img{height:180px;display:flex;align-items:center;justify-content:center;font-size:4rem;background:var(--bg);border-radius:var(--r);border:1px solid var(--border-light);margin-bottom:1rem;overflow:hidden}
.modal-img img{width:100%;height:100%;object-fit:cover;border-radius:var(--r)}
.modal-brand{font-size:0.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em}
.modal-name{font-size:1.4rem;font-weight:700;letter-spacing:-0.03em;margin:4px 0 8px;color:var(--text)}
.modal-spec{font-size:0.85rem;color:var(--muted);line-height:1.65;margin-bottom:1.2rem}
.modal-price-row{display:flex;align-items:center;justify-content:space-between;background:var(--bg);border-radius:var(--r-sm);padding:1rem;border:1px solid var(--border-light);margin-bottom:1.2rem}
.modal-price{font-size:1.5rem;font-weight:700;letter-spacing:-0.04em;color:var(--text)}
.modal-old{font-size:0.82rem;color:var(--muted2);text-decoration:line-through}
.modal-save{font-size:0.72rem;color:var(--green);font-weight:600}
.modal-badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1.2rem}
.modal-badge-item{background:var(--bg);border:1px solid var(--border-light);border-radius:6px;padding:0.35rem 0.7rem;font-size:0.72rem;color:var(--muted);letter-spacing:-0.01em}
.modal-badge-item span{font-weight:600;color:var(--text)}
.modal-order-btn{width:100%;background:var(--green);color:#fff;border:none;padding:1rem;border-radius:var(--r-sm);font-size:0.95rem;font-weight:600;cursor:pointer;font-family:var(--font);letter-spacing:-0.01em;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.15s}
.modal-order-btn:hover{background:#2db34a}
.modal-close{position:absolute;top:1.2rem;right:1.5rem;background:var(--bg);border:1px solid var(--border-light);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:0.85rem;color:var(--muted);display:flex;align-items:center;justify-content:center;transition:background 0.15s}
.modal-close:hover{background:var(--surface3)}

/* PROMO */
.promo-section{padding:0 2rem;max-width:1100px;margin:0 auto 0.5rem}
.promo-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.promo-card{border-radius:var(--r);padding:1.6rem;position:relative;overflow:hidden;border:1px solid transparent}
.promo-card.amber{background:linear-gradient(135deg,#fff9f0 0%,#fef3e2 100%);border-color:rgba(245,166,35,0.25)}
.promo-card.green{background:linear-gradient(135deg,#f0faf4 0%,#e6f7ec 100%);border-color:rgba(52,199,89,0.25)}
.promo-card h3{font-size:1rem;font-weight:700;letter-spacing:-0.03em;color:var(--text);margin-bottom:4px}
.promo-card p{font-size:0.8rem;color:var(--muted);line-height:1.5;letter-spacing:-0.01em;max-width:220px}
.promo-card .promo-icon{position:absolute;right:1.5rem;top:50%;transform:translateY(-50%);font-size:3rem;opacity:0.5}
.promo-cta{margin-top:0.9rem;display:inline-flex;align-items:center;gap:5px;font-size:0.78rem;font-weight:600;color:var(--accent);letter-spacing:-0.01em;cursor:pointer}

/* CART SHEET */
.cart-sheet{position:fixed;right:-380px;top:0;bottom:0;z-index:300;width:360px;background:var(--surface);box-shadow:-8px 0 40px rgba(0,0,0,0.12);transition:right 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;padding:1.5rem}
.cart-sheet.open{right:0}
.cart-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem}
.cart-title{font-size:1.1rem;font-weight:700;letter-spacing:-0.03em;color:var(--text)}
.cart-close{background:var(--bg);border:1px solid var(--border-light);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:0.85rem;color:var(--muted);display:flex;align-items:center;justify-content:center;transition:background 0.15s}
.cart-close:hover{background:var(--surface3)}
.cart-items{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
.cart-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center}
.cart-empty-icon{font-size:3rem;opacity:0.3}
.cart-empty p{font-size:0.85rem;color:var(--muted)}
.cart-item{background:var(--bg);border-radius:var(--r-sm);border:1px solid var(--border-light);padding:0.85rem;display:flex;align-items:center;gap:10px}
.ci-icon{width:42px;height:42px;background:var(--surface);border-radius:8px;border:1px solid var(--border-light);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;overflow:hidden}
.ci-icon img{width:100%;height:100%;object-fit:cover;border-radius:6px}
.ci-info{flex:1}
.ci-name{font-size:0.82rem;font-weight:600;letter-spacing:-0.02em;color:var(--text)}
.ci-price{font-size:0.75rem;color:var(--muted);margin-top:2px}
.ci-remove{background:none;border:none;cursor:pointer;font-size:0.8rem;color:var(--muted2);padding:4px;border-radius:4px;transition:color 0.15s}
.ci-remove:hover{color:var(--red)}
.cart-footer{margin-top:1.2rem;border-top:1px solid var(--border-light);padding-top:1.2rem}
.cart-total-row{display:flex;justify-content:space-between;margin-bottom:1rem}
.cart-total-label{font-size:0.85rem;color:var(--muted)}
.cart-total-price{font-size:1rem;font-weight:700;letter-spacing:-0.02em;color:var(--text)}
.cart-wa-btn{width:100%;background:var(--green);color:#fff;border:none;padding:1rem;border-radius:var(--r-sm);font-size:0.92rem;font-weight:600;cursor:pointer;font-family:var(--font);letter-spacing:-0.01em;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.15s}
.cart-wa-btn:hover{background:#2db34a}
.cart-overlay{position:fixed;inset:0;z-index:290;background:rgba(0,0,0,0.3);opacity:0;pointer-events:none;transition:opacity 0.25s}
.cart-overlay.open{opacity:1;pointer-events:all}

/* FOOTER */
footer{background:var(--surface);border-top:1px solid var(--border-light);padding:2.5rem 2rem;margin-top:2rem}
.footer-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:2rem}
.footer-brand .logo{display:inline-flex;font-size:1.1rem;margin-bottom:0.6rem}
.footer-brand p{font-size:0.8rem;color:var(--muted);line-height:1.6;max-width:260px;letter-spacing:-0.01em}
.footer-col h4{font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:0.8rem}
.footer-col a{display:block;font-size:0.82rem;color:var(--text2);text-decoration:none;margin-bottom:0.5rem;letter-spacing:-0.01em;transition:color 0.15s}
.footer-col a:hover{color:var(--accent)}
.footer-bottom{max-width:1100px;margin:1.5rem auto 0;padding-top:1.2rem;border-top:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem}
.footer-bottom p{font-size:0.73rem;color:var(--muted);letter-spacing:-0.01em}
.payment-logos{display:flex;gap:6px}
.pay-badge{background:var(--bg);border:1px solid var(--border-light);border-radius:5px;padding:3px 8px;font-size:0.65rem;font-weight:600;color:var(--muted);letter-spacing:-0.01em}

/* TOAST */
.toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(29,29,31,0.92);color:#fff;padding:0.65rem 1.2rem;border-radius:50px;font-size:0.82rem;font-weight:500;letter-spacing:-0.01em;z-index:600;opacity:0;transition:opacity 0.2s,transform 0.2s;pointer-events:none;backdrop-filter:blur(10px);white-space:nowrap}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

/* RESPONSIVE */
@media(max-width:780px){
  .hero{grid-template-columns:1fr;padding:2rem 1.25rem 1.5rem}
  .hero h1{font-size:2.5rem}
  .hero-visual{min-height:auto}
  nav{padding:0 1.25rem}
  .nav-links{display:none}
  .hamburger{display:flex}
  .trust-inner{grid-template-columns:1fr}
  .trust-item{border-right:none;border-bottom:1px solid var(--border-light)}
  .trust-item:last-child{border-bottom:none}
  .section,.promo-section,.trust-bar,.delivery-banner{padding-left:1.25rem;padding-right:1.25rem}
  .delivery-banner-inner{flex-wrap:wrap;text-align:left}
  .promo-grid{grid-template-columns:1fr}
  .footer-inner{grid-template-columns:1fr}
  .footer-col{display:none}
  .hero-stats{flex-direction:column}
  .stat{border-right:none;border-bottom:1px solid var(--border-light);text-align:left;display:flex;align-items:center;gap:0.8rem}
  .stat:last-child{border-bottom:none}
  .cart-sheet{width:100%;right:-100%}
  .cart-sheet.open{right:0}
}
@media(max-width:480px){
  .hero h1{font-size:2rem}
  .wa-nav-btn span{display:none}
}
