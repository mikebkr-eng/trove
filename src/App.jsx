import { useState, useCallback, useEffect, useRef } from "react";

const API_URL = "/api/trove";

const SEARCH_EXAMPLES = [
  "best ice climbing crampons under $300",
  "handmade ceramic coffee mug",
  "lightweight hiking boots for women",
  "cast iron skillet for beginners",
  "cozy merino wool sweater",
  "sustainable yoga mat",
  "vintage-style leather wallet",
  "pour-over coffee kit",
  "packable down jacket for travel",
  "ergonomic desk chair under $500",
  "artisan hot sauce gift set",
  "waterproof trail running shoes",
  "Japanese chef's knife",
  "solar-powered camping lantern",
  "natural skincare gift set",
  "minimalist watch under $200",
  "kids outdoor adventure kit",
  "wooden cutting board handmade",
  "cold brew coffee maker",
  "climbing harness for beginners",
];

const STORE_EXAMPLES = [
  ["Etsy", "MEC", "Patagonia", "Williams Sonoma", "Indigo"],
  ["Arc'teryx", "Sport Chek", "Sur La Table", "Uncommon Goods", "Etsy"],
  ["REI", "Backcountry", "Hudson's Bay", "Simons", "Altitude Sports"],
  ["Sporting Life", "Chapters", "Crate & Barrel", "Ten Thousand Villages", "Etsy"],
  ["MEC", "Patagonia", "Nordstrom", "Terrain", "Etsy"],
];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Encode/decode store for sharing via URL
function encodeStore(items) {
  try {
    const slim = items.slice(0,10).map(p => ({
      n: p.name, s: p.store, p: p.price, u: p.url, w: p.why?.slice(0,80)
    }));
    return btoa(encodeURIComponent(JSON.stringify(slim)));
  } catch { return null; }
}

function decodeStore(encoded) {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))).map(p => ({
      name: p.n, store: p.s, price: p.p, url: p.u, why: p.w, matchReason: true, tags: []
    }));
  } catch { return null; }
}

function getUserHandle() {
  let handle = localStorage.getItem("trove_handle");
  if (!handle) {
    handle = "trove-" + Math.random().toString(36).slice(2,6);
    localStorage.setItem("trove_handle", handle);
  }
  return handle;
}
function getRandomN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const WORLD_COUNTRIES = [
  { code:"JP", name:"Japan",          flag:"🇯🇵", known:"Knives, stationery, ceramics", vibe:"Precise, minimal, beautiful" },
  { code:"IT", name:"Italy",          flag:"🇮🇹", known:"Kitchen, leather, fashion",    vibe:"Crafted with passion" },
  { code:"FR", name:"France",         flag:"🇫🇷", known:"Beauty, cookware, linen",      vibe:"Effortlessly refined" },
  { code:"DE", name:"Germany",        flag:"🇩🇪", known:"Tools, engineering, outdoor",  vibe:"Built to last" },
  { code:"GB", name:"United Kingdom", flag:"🇬🇧", known:"Wool, tea, heritage brands",   vibe:"Classic with character" },
  { code:"SE", name:"Sweden",         flag:"🇸🇪", known:"Design, outdoor, homeware",    vibe:"Clean, functional, warm" },
  { code:"DK", name:"Denmark",        flag:"🇩🇰", known:"Design, cycling, hygge",       vibe:"Cosy and considered" },
  { code:"US", name:"United States",  flag:"🇺🇸", known:"Outdoor gear, denim, tech",    vibe:"Go big or go home" },
  { code:"AU", name:"Australia",      flag:"🇦🇺", known:"Surf, skincare, outdoor",      vibe:"Laid-back and sun-worn" },
  { code:"NZ", name:"New Zealand",    flag:"🇳🇿", known:"Wool, adventure gear, honey",  vibe:"Pure and rugged" },
  { code:"KR", name:"South Korea",    flag:"🇰🇷", known:"Skincare, tech, stationery",   vibe:"Innovative and precise" },
  { code:"PT", name:"Portugal",       flag:"🇵🇹", known:"Ceramics, cork, linen",        vibe:"Simple and soulful" },
  { code:"MX", name:"Mexico",         flag:"🇲🇽", known:"Textiles, ceramics, spices",   vibe:"Vibrant and handmade" },
  { code:"IN", name:"India",          flag:"🇮🇳", known:"Textiles, spices, jewelry",    vibe:"Rich, colourful, artisan" },
];

const WORLD_CURRENCY = {
  JP:"JPY", IT:"EUR", FR:"EUR", DE:"EUR", GB:"GBP", SE:"SEK",
  DK:"DKK", US:"USD", AU:"AUD", NZ:"NZD", KR:"KRW", PT:"EUR",
  MX:"MXN", IN:"INR",
};

const WORLD_STORES = {
  JP: "Muji, Tokyu Hands, Loft, Rakuten, Amazon Japan, Japanese Etsy sellers",
  IT: "Etsy Italian sellers, La Rinascente, Artemest, Italian leather brands",
  FR: "Le Creuset, Maison du Monde, French Etsy sellers, Merci Paris, BHV",
  DE: "Manufactum, Globetrotter, German Etsy sellers, WMF, Zwilling",
  GB: "John Lewis, Monocle Shop, Etsy UK, Lakeland, Wool and the Gang",
  SE: "IKEA, Åhléns, Swedish Etsy sellers, Fjällräven, Granit",
  DK: "Hay, Normann Copenhagen, Danish Etsy sellers, Aiaiai, Stelton",
  US: "REI, Patagonia, Levi's, Filson, American Etsy sellers, Buck Mason",
  AU: "Kathmandu, R.M. Williams, Australian Etsy sellers, Aesop, Country Road",
  NZ: "Allbirds, Icebreaker, Macpac, New Zealand Etsy sellers, Swanndri",
  KR: "Olive Young, Korean Etsy sellers, Musinsa, Innisfree, 10x10",
  PT: "Bordallo Pinheiro, Portuguese Etsy sellers, Vista Alegre, Cork brands",
  MX: "Mexican Etsy sellers, Fonart, local artisan brands",
  IN: "Fabindia, Indian Etsy sellers, Good Earth, Anokhi",
};

const COUNTRIES = [
  { code:"CA", name:"Canada",         currency:"CAD", flag:"🇨🇦" },
  { code:"US", name:"United States",  currency:"USD", flag:"🇺🇸" },
  { code:"GB", name:"United Kingdom", currency:"GBP", flag:"🇬🇧" },
  { code:"AU", name:"Australia",      currency:"AUD", flag:"🇦🇺" },
  { code:"NZ", name:"New Zealand",    currency:"NZD", flag:"🇳🇿" },
  { code:"FR", name:"France",         currency:"EUR", flag:"🇫🇷" },
  { code:"DE", name:"Germany",        currency:"EUR", flag:"🇩🇪" },
  { code:"NL", name:"Netherlands",    currency:"EUR", flag:"🇳🇱" },
  { code:"ES", name:"Spain",          currency:"EUR", flag:"🇪🇸" },
  { code:"IT", name:"Italy",          currency:"EUR", flag:"🇮🇹" },
  { code:"JP", name:"Japan",          currency:"JPY", flag:"🇯🇵" },
  { code:"KR", name:"South Korea",    currency:"KRW", flag:"🇰🇷" },
  { code:"SG", name:"Singapore",      currency:"SGD", flag:"🇸🇬" },
  { code:"HK", name:"Hong Kong",      currency:"HKD", flag:"🇭🇰" },
];

function detectCountryCode() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const lang = navigator.language || "en-CA";
  const tzMap = {
    "America/Toronto":"CA","America/Vancouver":"CA","America/Edmonton":"CA",
    "America/Winnipeg":"CA","America/Halifax":"CA","America/St_Johns":"CA",
    "America/New_York":"US","America/Chicago":"US","America/Denver":"US",
    "America/Los_Angeles":"US","America/Phoenix":"US","America/Anchorage":"US",
    "Europe/London":"GB","Europe/Paris":"FR","Europe/Berlin":"DE",
    "Europe/Amsterdam":"NL","Europe/Madrid":"ES","Europe/Rome":"IT",
    "Australia/Sydney":"AU","Australia/Melbourne":"AU","Australia/Perth":"AU",
    "Pacific/Auckland":"NZ","Asia/Tokyo":"JP","Asia/Seoul":"KR",
    "Asia/Singapore":"SG","Asia/Hong_Kong":"HK",
  };
  return tzMap[tz] || (lang.includes("-") ? lang.split("-")[1].toUpperCase() : "CA");
}

function getLocaleByCode(code) {
  return COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #faf7f2;
    --warm-white: #fffef9;
    --ink: #1a1814;
    --ink2: #3d3a35;
    --muted: #8c8880;
    --border: #e8e3db;
    --border2: #d4cec4;
    --gold: #c4923a;
    --gold-light: #f5ead6;
    --gold-mid: #e8c882;
    --sage: #6b8c6e;
    --sage-light: #eaf1eb;
    --rust: #b85c3a;
    --rust-light: #faeee9;
    --blue: #3a6eb8;
    --blue-light: #eaf0fa;
    --card-shadow: 0 2px 12px rgba(26,24,20,0.07), 0 1px 3px rgba(26,24,20,0.05);
    --card-shadow-hover: 0 8px 32px rgba(26,24,20,0.12), 0 2px 8px rgba(26,24,20,0.08);
  }

  html, body, #root {
    height: 100%; background: var(--cream);
    font-family: 'DM Sans', sans-serif; color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }

  .app {
    max-width: 430px; margin: 0 auto;
    min-height: 100vh; background: var(--cream);
    display: flex; flex-direction: column;
    position: relative;
  }

  /* ── HEADER ── */
  .header {
    padding: 18px 20px 14px;
    background: var(--warm-white);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 100;
  }
  .logo {
    font-family: 'Playfair Display', serif;
    font-size: 26px; font-weight: 700; color: var(--ink);
    letter-spacing: -0.5px; cursor: pointer;
  }
  .logo span { color: var(--gold); }
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .icon-btn {
    width: 36px; height: 36px; border-radius: 50%;
    border: 1px solid var(--border); background: var(--cream);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; color: var(--ink2);
  }
  .icon-btn:hover { background: var(--border); }
  .icon-btn.active { background: var(--gold-light); border-color: var(--gold-mid); color: var(--gold); }

  /* ── NAV ── */
  .nav {
    display: flex; background: var(--warm-white);
    border-top: 1px solid var(--border);
    position: sticky; bottom: 0; z-index: 100;
  }
  .nav-btn {
    flex: 1; padding: 10px 4px 12px; border: none; background: none;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.5px;
    transition: color 0.15s; position: relative;
  }
  .nav-btn.active { color: var(--gold); }
  .nav-btn.active svg { stroke: var(--gold); }
  .nav-dot {
    position: absolute; top: 8px; right: calc(50% - 14px);
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--gold); border: 2px solid var(--warm-white);
  }

  /* ── SCROLL AREA ── */
  .scroll { flex: 1; overflow-y: auto; padding-bottom: 80px; }

  /* ── DISCOVER TAB ── */
  .discover-hero {
    padding: 28px 20px 20px;
    background: linear-gradient(160deg, var(--warm-white) 0%, var(--cream) 100%);
    border-bottom: 1px solid var(--border);
  }
  .discover-greeting {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 1.5px; color: var(--muted); margin-bottom: 6px;
  }
  .discover-title {
    font-family: 'Playfair Display', serif;
    font-size: 28px; font-weight: 700; line-height: 1.2;
    color: var(--ink); margin-bottom: 4px;
  }
  .discover-title span { color: var(--gold); }
  .discover-sub { font-size: 13px; color: var(--muted); font-weight: 400; margin-bottom: 20px; }

  .search-row { display: flex; gap: 8px; }
  .search-box {
    flex: 1; display: flex; align-items: center; gap: 10px;
    background: var(--warm-white); border: 1.5px solid var(--border2);
    border-radius: 12px; padding: 12px 14px;
    transition: border-color 0.15s;
  }
  .search-box:focus-within { border-color: var(--gold-mid); }
  .search-box input {
    flex: 1; border: none; outline: none; background: none;
    font-family: 'DM Sans', sans-serif; font-size: 14px;
    color: var(--ink); font-weight: 400;
  }
  .search-box input::placeholder { color: var(--muted); }
  .search-btn {
    padding: 12px 18px; background: var(--ink); color: var(--warm-white);
    border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
    white-space: nowrap;
  }
  .search-btn:hover { background: var(--ink2); }
  .search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* taste chips */
  .taste-row {
    display: flex; gap: 6px; overflow-x: auto; padding: 14px 20px 0;
    scrollbar-width: none;
  }
  .taste-row::-webkit-scrollbar { display: none; }
  .taste-chip {
    white-space: nowrap; padding: 6px 12px; border-radius: 100px;
    border: 1.5px solid var(--border2); background: var(--warm-white);
    font-size: 12px; font-weight: 600; color: var(--ink2);
    cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .taste-chip:hover { border-color: var(--gold-mid); color: var(--gold); }
  .taste-chip.active { background: var(--gold-light); border-color: var(--gold-mid); color: var(--gold); }

  /* World tab */
  .world-header { padding: 24px 20px 16px; }
  .world-title { font-family:"Playfair Display",serif; font-size:24px; font-weight:700; color:var(--ink); margin-bottom:6px; }
  .world-sub { font-size:13px; color:var(--muted); line-height:1.6; }
  .world-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:0 16px 16px; }
  .world-card {
    border-radius:14px; border:1.5px solid var(--border);
    background:var(--warm-white); padding:14px; cursor:pointer;
    transition:all 0.15s; text-align:left;
  }
  .world-card:hover { border-color:var(--gold-mid); background:var(--gold-light); transform:translateY(-1px); }
  .world-card.active { border-color:var(--gold); background:var(--gold-light); }
  .world-card-flag { font-size:28px; margin-bottom:8px; }
  .world-card-name { font-size:14px; font-weight:700; color:var(--ink); margin-bottom:3px; }
  .world-card-known { font-size:11px; color:var(--muted); line-height:1.5; }
  .world-card-vibe { font-size:11px; color:var(--gold); font-weight:600; margin-top:4px; font-style:italic; }
  .world-surprise {
    margin:0 16px 10px; padding:14px 16px; border-radius:14px;
    border:1.5px dashed var(--gold-mid); background:var(--gold-light);
    cursor:pointer; display:flex; align-items:center; gap:12px;
    font-family:"DM Sans",sans-serif; transition:all 0.15s;
  }
  .world-surprise:hover { background:var(--cream); border-color:var(--gold); }
  .world-results-header {
    padding:16px 20px 8px; display:flex; align-items:center; gap:10px;
  }
  .world-back {
    background:none; border:none; cursor:pointer; color:var(--muted);
    font-size:13px; font-family:"DM Sans",sans-serif; padding:0;
    display:flex; align-items:center; gap:4px;
  }
  .world-back:hover { color:var(--ink); }

  .country-picker-list { display: flex; flex-direction: column; gap: 4px; max-height: 340px; overflow-y: auto; }
  .country-option {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-radius: 10px; border: none; background: none; cursor: pointer;
    font-family: "DM Sans", sans-serif; width: 100%; transition: background 0.15s;
  }
  .country-option:hover { background: var(--cream); }
  .country-option.active { background: var(--gold-light); }
  .country-flag { font-size: 22px; }
  .country-name { font-size: 14px; font-weight: 600; color: var(--ink); flex: 1; text-align: left; }
  .country-currency { font-size: 12px; color: var(--muted); font-weight: 500; }

  .price-filter-row {
    display: flex; gap: 6px; padding: 12px 16px 4px; overflow-x: auto; scrollbar-width: none;
  }
  .price-filter-row::-webkit-scrollbar { display: none; }
  .price-chip {
    white-space: nowrap; padding: 5px 12px; border-radius: 100px;
    border: 1.5px solid var(--border2); background: var(--warm-white);
    font-size: 12px; font-weight: 700; color: var(--ink2);
    cursor: pointer; transition: all 0.15s; font-family: "DM Sans", sans-serif;
  }
  .price-chip:hover { border-color: var(--gold-mid); }
  .price-chip.active { background: var(--gold-light); border-color: var(--gold); color: var(--gold); }

  .rating-badge {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 11px; font-weight: 700; color: var(--gold);
    background: var(--gold-light); border: 1px solid var(--gold-mid);
    border-radius: 100px; padding: 2px 8px; margin-left: 6px;
  }

  /* ── SECTION HEADER ── */
  .section-header {
    display: flex; align-items: baseline; justify-content: space-between;
    padding: 20px 20px 12px;
  }
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 600; color: var(--ink);
  }
  .section-sub { font-size: 12px; color: var(--muted); font-weight: 500; }

  /* ── PRODUCT CARD ── */
  .products-grid { padding: 0 16px; display: flex; flex-direction: column; gap: 16px; }
  .product-card {
    background: var(--warm-white); border-radius: 14px;
    border: 1px solid var(--border); box-shadow: var(--card-shadow);
    overflow: hidden; transition: all 0.2s; animation: fadeUp 0.4s ease both;
  }
  .product-card:hover { box-shadow: var(--card-shadow-hover); transform: translateY(-1px); }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .product-card-body { padding: 20px; }
  .product-store-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px;
  }
  .product-store {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--muted);
    display: flex; align-items: center; gap: 5px;
  }
  .store-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--gold);
  }
  .product-match {
    font-size: 10px; font-weight: 700; padding: 3px 8px;
    border-radius: 100px; background: var(--sage-light); color: var(--sage);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .product-name {
    font-family: 'Playfair Display', serif;
    font-size: 17px; font-weight: 600; color: var(--ink);
    line-height: 1.3; margin-bottom: 6px;
  }
  .product-why {
    font-size: 12px; color: var(--muted); line-height: 1.6;
    margin-bottom: 12px; font-weight: 400;
  }
  .product-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding-top: 12px; border-top: 1px solid var(--border);
  }
  .product-price {
    font-size: 18px; font-weight: 700; color: var(--ink);
    letter-spacing: -0.5px;
  }
  .product-price-sub { font-size: 11px; color: var(--muted); font-weight: 400; }
  .product-actions { display: flex; gap: 8px; align-items: center; }
  .btn-save {
    padding: 8px 14px; border-radius: 8px;
    background: var(--gold-light); border: 1px solid var(--gold-mid);
    color: var(--gold); font-size: 12px; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
  }
  .btn-save:hover { background: var(--gold); color: white; }
  .btn-save.saved { background: var(--gold); color: white; border-color: var(--gold); }
  .btn-buy {
    padding: 8px 14px; border-radius: 8px;
    background: var(--ink); border: 1px solid var(--ink);
    color: white; font-size: 12px; font-weight: 700;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.15s; text-decoration: none;
    display: flex; align-items: center; gap: 5px;
  }
  .btn-buy:hover { background: var(--ink2); }

  /* category tag */
  .product-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  .product-tag {
    font-size: 10px; font-weight: 600; padding: 3px 8px;
    border-radius: 100px; background: var(--cream); border: 1px solid var(--border);
    color: var(--ink2); text-transform: uppercase; letter-spacing: 0.5px;
  }

  /* ── LOADING ── */
  .loading-section { padding: 40px 20px; text-align: center; }
  .loading-spinner {
    width: 36px; height: 36px; border: 3px solid var(--border);
    border-top-color: var(--gold); border-radius: 50%;
    animation: spin 0.8s linear infinite; margin: 0 auto 16px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-label {
    font-family: 'Playfair Display', serif;
    font-size: 16px; color: var(--ink2); margin-bottom: 4px;
  }
  .loading-sub { font-size: 12px; color: var(--muted); }

  /* ── EMPTY ── */
  .empty-section {
    padding: 48px 28px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .empty-icon { font-size: 44px; margin-bottom: 4px; }
  .empty-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 600; color: var(--ink);
  }
  .empty-sub { font-size: 13px; color: var(--muted); line-height: 1.6; max-width: 260px; }

  /* ── MY STORE TAB ── */
  .store-header {
    padding: 24px 20px 16px;
    background: var(--warm-white); border-bottom: 1px solid var(--border);
  }
  .store-title {
    font-family: 'Playfair Display', serif;
    font-size: 24px; font-weight: 700; color: var(--ink); margin-bottom: 4px;
  }
  .store-sub { font-size: 13px; color: var(--muted); }
  .share-btn {
    display: flex; align-items: center; gap: 7px;
    margin-top: 14px; padding: 10px 16px; border-radius: 10px;
    background: var(--ink); color: white; border: none;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; width: fit-content;
  }
  .share-btn:hover { background: var(--ink2); }
  .share-copied { background: var(--sage) !important; }

  /* ── PROFILE TAB ── */
  .profile-section { padding: 20px; }
  .profile-card {
    background: var(--warm-white); border: 1px solid var(--border);
    border-radius: 14px; padding: 20px; margin-bottom: 12px;
    box-shadow: var(--card-shadow);
  }
  .profile-card-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--muted); margin-bottom: 14px;
  }
  .taste-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .taste-pill {
    padding: 7px 14px; border-radius: 100px;
    border: 1.5px solid var(--border2); background: var(--cream);
    font-size: 12px; font-weight: 600; color: var(--ink2);
    cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .taste-pill.active { background: var(--gold-light); border-color: var(--gold); color: var(--gold); }
  .taste-pill.disliked { background: var(--rust-light); border-color: var(--rust); color: var(--rust); text-decoration: line-through; }
  .profile-stat {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0; border-bottom: 1px solid var(--border);
  }
  .profile-stat:last-child { border-bottom: none; }
  .profile-stat-label { font-size: 13px; color: var(--ink2); font-weight: 500; }
  .profile-stat-val { font-size: 13px; color: var(--muted); font-weight: 400; }
  .profile-empty {
    font-size: 12px; color: var(--muted); font-style: italic; text-align: center;
    padding: 12px 0;
  }

  /* Onboarding prompt */
  .onboarding-prompt {
    position: fixed; inset: 0; background: rgba(26,24,20,0.4);
    z-index: 250; display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  .onboarding-prompt-sheet {
    background: var(--warm-white); border-radius: 20px 20px 0 0;
    padding: 8px 24px 40px; width: 100%; max-width: 430px;
    animation: slideUp 0.25s ease;
  }
  .onboarding-prompt-icon { font-size: 36px; margin: 16px 0 10px; }
  .onboarding-prompt-title {
    font-family: "Playfair Display", serif;
    font-size: 22px; font-weight: 700; color: var(--ink); margin-bottom: 8px;
  }
  .onboarding-prompt-sub {
    font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 20px;
  }

  /* Onboarding */
  .onboarding-overlay {
    position: fixed; inset: 0; background: var(--cream);
    z-index: 300; display: flex; flex-direction: column;
    max-width: 430px; margin: 0 auto;
  }
  .onboarding-header {
    padding: 52px 28px 0;
    display: flex; flex-direction: column;
  }
  .onboarding-progress {
    display: flex; gap: 6px; margin-bottom: 32px;
  }
  .onboarding-progress-dot {
    height: 3px; flex: 1; border-radius: 2px; background: var(--border2);
    transition: background 0.3s;
  }
  .onboarding-progress-dot.done { background: var(--gold); }
  .onboarding-question {
    font-family: "Playfair Display", serif;
    font-size: 26px; font-weight: 700; color: var(--ink);
    line-height: 1.25; margin-bottom: 8px;
  }
  .onboarding-sub { font-size: 14px; color: var(--muted); margin-bottom: 28px; }
  .onboarding-body { flex: 1; overflow-y: auto; padding: 0 28px; }
  .onboarding-footer {
    padding: 16px 28px 40px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .vibe-cloud {
    display: flex; flex-wrap: wrap; gap: 10px;
  }
  .vibe-btn {
    padding: 10px 16px; border-radius: 100px;
    border: 1.5px solid var(--border2); background: var(--warm-white);
    cursor: pointer; font-family: "DM Sans", sans-serif;
    display: flex; align-items: center; gap: 8px;
    transition: all 0.2s; font-size: 14px; font-weight: 600; color: var(--ink2);
  }
  .vibe-btn:hover { border-color: var(--gold-mid); background: var(--gold-light); }
  .vibe-btn.active {
    background: var(--gold-light); border-color: var(--gold);
    color: var(--gold); transform: scale(1.04);
  }
  .vibe-emoji { font-size: 16px; }
  .budget-list { display: flex; flex-direction: column; gap: 10px; }
  .budget-btn {
    padding: 16px; border-radius: 12px;
    border: 1.5px solid var(--border2); background: var(--warm-white);
    cursor: pointer; font-family: "DM Sans", sans-serif;
    display: flex; align-items: center; gap: 14px; transition: all 0.15s;
  }
  .budget-btn.active { background: var(--gold-light); border-color: var(--gold); }
  .budget-emoji { font-size: 24px; }
  .budget-label { font-size: 14px; font-weight: 700; color: var(--ink); }
  .budget-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .onboarding-input {
    width: 100%; padding: 16px; border-radius: 12px;
    border: 1.5px solid var(--border2); background: var(--warm-white);
    font-family: "DM Sans", sans-serif; font-size: 14px; color: var(--ink);
    outline: none; resize: none; line-height: 1.6;
    transition: border-color 0.15s;
  }
  .onboarding-input:focus { border-color: var(--gold-mid); }
  .onboarding-btn {
    width: 100%; padding: 15px; border-radius: 12px; border: none;
    font-family: "DM Sans", sans-serif; font-size: 15px; font-weight: 700;
    cursor: pointer; transition: all 0.15s;
  }
  .onboarding-btn-primary { background: var(--ink); color: white; }
  .onboarding-btn-primary:hover { background: var(--ink2); }
  .onboarding-btn-skip {
    background: none; color: var(--muted); font-size: 13px; font-weight: 500;
    border: none; padding: 8px;
  }

  /* Share modal */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(26,24,20,0.5);
    z-index: 200; display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  .modal-sheet {
    background: var(--warm-white); border-radius: 20px 20px 0 0;
    padding: 28px 24px 40px; width: 100%; max-width: 430px;
    animation: slideUp 0.25s ease;
  }
  @keyframes slideUp { from { transform: translateY(40px); opacity:0; } to { transform: translateY(0); opacity:1; } }
  .modal-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: var(--border2); margin: 0 auto 20px;
  }
  .modal-title {
    font-family: "Playfair Display", serif;
    font-size: 20px; font-weight: 700; color: var(--ink); margin-bottom: 6px;
  }
  .modal-sub { font-size: 13px; color: var(--muted); line-height: 1.6; margin-bottom: 20px; }
  .modal-preview {
    background: var(--cream); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;
  }
  .modal-preview-name { font-size: 15px; font-weight: 700; color: var(--ink); margin-bottom: 3px; }
  .modal-preview-meta { font-size: 12px; color: var(--muted); }
  .modal-msg {
    background: var(--cream); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;
    font-size: 13px; color: var(--ink2); line-height: 1.7; font-style: italic;
  }
  .modal-btn {
    width: 100%; padding: 14px; border-radius: 12px;
    border: none; font-family: "DM Sans", sans-serif;
    font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s;
    margin-bottom: 8px;
  }
  .modal-btn-primary { background: var(--ink); color: white; }
  .modal-btn-primary:hover { background: var(--ink2); }
  .modal-btn-primary.copied { background: var(--sage); }
  .modal-btn-secondary {
    background: none; border: 1.5px solid var(--border2) !important;
    color: var(--ink2); font-size: 13px;
  }

  /* Share button on card */
  .btn-share {
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--cream);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; color: var(--muted); flex-shrink: 0;
  }
  .btn-share:hover { border-color: var(--gold-mid); color: var(--gold); background: var(--gold-light); }

  /* error */
  .error-bar {
    margin: 16px 20px; padding: 12px 16px; border-radius: 10px;
    background: var(--rust-light); border: 1px solid var(--rust);
    font-size: 13px; color: var(--rust); font-weight: 500;
  }

  /* divider */
  .divider { height: 1px; background: var(--border); margin: 4px 0; }
`;

// ── HELPERS ──────────────────────────────────────────────────────────────────
function buildTasteProfile(history) {
  if (!history || history.length === 0) return null;
  const liked = history.filter(h => h.reaction === "liked" || h.reaction === "saved");
  const disliked = history.filter(h => h.reaction === "disliked");
  const categories = {};
  history.forEach(h => { if (h.category) categories[h.category] = (categories[h.category] || 0) + 1; });
  const topCats = Object.entries(categories).sort((a,b) => b[1]-a[1]).slice(0,5).map(([k]) => k);
  const tags = history.flatMap(h => h.activeMissionTags || []);
  const tagCounts = {};
  tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  const topTags = Object.entries(tagCounts).sort((a,b) => b[1]-a[1]).slice(0,8).map(([k]) => k);
  const prices = history.map(h => h.priceRange).filter(Boolean);
  return {
    likedProducts: liked.slice(0,5).map(h => h.productName).filter(Boolean),
    dislikedProducts: disliked.slice(0,3).map(h => h.productName).filter(Boolean),
    topCategories: topCats,
    topTags,
    scanCount: history.length,
    likedCount: liked.length,
  };
}

const VIBES = [
  { emoji: "🏔️", label: "Outdoorsy" },
  { emoji: "🏠", label: "Homebody" },
  { emoji: "🍳", label: "Foodie" },
  { emoji: "✈️", label: "Adventurer" },
  { emoji: "🎨", label: "Creative" },
  { emoji: "🧘", label: "Wellness" },
  { emoji: "💻", label: "Tech nerd" },
  { emoji: "📚", label: "Bookworm" },
  { emoji: "🌿", label: "Eco-minded" },
  { emoji: "🎵", label: "Music lover" },
  { emoji: "🐾", label: "Pet parent" },
  { emoji: "⚽", label: "Sports fan" },
];

const BUDGET_STYLES = [
  { emoji: "🏷️", label: "Bargain hunter", sub: "I love a great deal" },
  { emoji: "⚖️", label: "Sweet spot", sub: "Quality meets value" },
  { emoji: "💎", label: "Quality first", sub: "Worth paying more" },
];

const ONBOARDING_STEPS = [
  { id: "vibes", question: "What's your vibe?", sub: "Pick a few that feel like you", type: "vibes" },
  { id: "budget", question: "How do you shop?", sub: "No wrong answers here", type: "budget" },
  { id: "interests", question: "What are you into lately?", sub: "Anything goes — a hobby, an obsession, a phase", type: "text", placeholder: "e.g. sourdough baking, trail running, vintage cameras..." },
  { id: "avoid", question: "Anything you never want to see?", sub: "Optional — skip if you're easy going", type: "text", placeholder: "e.g. fur products, fast fashion, anything over $200..." },
];

const DISCOVER_CHIPS = [
  "Outdoor & Gear", "Kitchen & Home", "Sustainable", "Handmade & Artisan",
  "Tech & Gadgets", "Fashion & Style", "Health & Wellness", "Books & Learning"
];

// ── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, isSaved, onSave, onShare, index }) {
  return (
    <div className="product-card" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="product-card-body">
        <div className="product-store-row">
          <div className="product-store">
            <div className="store-dot" />
            {product.store}
            {product.rating && (
              <span className="rating-badge">
                ★ {product.rating}
              </span>
            )}
          </div>
          {product.matchReason && (
            <div className="product-match">✦ Great match</div>
          )}
        </div>
        <div className="product-name">{product.name}</div>
        {product.tags?.length > 0 && (
          <div className="product-tags">
            {product.tags.slice(0,3).map((t,i) => (
              <span className="product-tag" key={i}>{t}</span>
            ))}
          </div>
        )}
        <div className="product-why">{product.why}</div>
        <div className="product-footer">
          <div>
            <div className="product-price">{product.price}</div>
            {product.priceSub && <div className="product-price-sub">{product.priceSub}</div>}
          </div>
          <div className="product-actions">
            <button className="btn-share" onClick={() => onShare && onShare(product)} title="Send to a friend">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
            <button className={`btn-save ${isSaved ? "saved" : ""}`} onClick={() => onSave(product)}>
              {isSaved ? "✓ Saved" : "🔖 Save"}
            </button>
            <a className="btn-buy" href={product.url} target="_blank" rel="noopener noreferrer">
              Buy
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // Check if viewing a shared store
  const urlParams = new URLSearchParams(window.location.search);
  const sharedData = urlParams.get("store");
  const sharedItems = sharedData ? decodeStore(sharedData) : null;
  const isSharedView = !!sharedItems;

  const [tab, setTab] = useState(isSharedView ? "store" : "discover");
  const [userHandle] = useState(getUserHandle);
  const [searchPlaceholder] = useState(() => getRandom(SEARCH_EXAMPLES));
  const [priceFilter, setPriceFilter] = useState(null);
  const [discoverAngle, setDiscoverAngle] = useState(null);
  const [worldCountry, setWorldCountry] = useState(null);
  const [worldProducts, setWorldProducts] = useState([]);
  const [worldLoading, setWorldLoading] = useState(false);
  const [worldError, setWorldError] = useState(null);
  const [worldAngle, setWorldAngle] = useState(null);

  // Onboarding
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(() => {
    return !localStorage.getItem("trove_profile_done");
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("trove_profile") || "{}"); } catch { return {}; }
  });
  const [onboardingAnswers, setOnboardingAnswers] = useState({
    vibes: [], budget: null, interests: "", avoid: ""
  }); // null | 50 | 150 | 300 | 999
  const [featuredStores] = useState(() => getRandom(STORE_EXAMPLES));
  const [localeCode, setLocaleCode] = useState(() => {
    return localStorage.getItem("trove_country") || detectCountryCode();
  });
  const locale = getLocaleByCode(localeCode);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const switchCountry = (code) => {
    setLocaleCode(code);
    localStorage.setItem("trove_country", code);
    setShowCountryPicker(false);
    setProducts([]);
    setDiscoverAngle(null);
  };
  const [query, setQuery] = useState("");
  const [activeChips, setActiveChips] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Finding products...");
  const [error, setError] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareItem, setShareItem] = useState(null); // single item share modal
  const [shareItemCopied, setShareItemCopied] = useState(false);

  // Saved store items
  const [storeItems, setStoreItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("trove_store") || "[]"); } catch { return []; }
  });

  // ScanRate history (read-only, imported for taste profile)
  const [scanHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("scanrate_history") || "[]"); } catch { return []; }
  });

  const tasteProfile = buildTasteProfile(scanHistory);

  useEffect(() => {
    localStorage.setItem("trove_store", JSON.stringify(storeItems));
  }, [storeItems]);

  const toggleChip = (chip) => {
    setActiveChips(c => c.includes(chip) ? c.filter(x => x !== chip) : [...c, chip]);
  };

  const isSaved = (product) => storeItems.some(s => s.name === product.name && s.store === product.store);

  const toggleSave = useCallback((product) => {
    setStoreItems(items => {
      const exists = items.some(s => s.name === product.name && s.store === product.store);
      return exists ? items.filter(s => !(s.name === product.name && s.store === product.store))
                    : [{ ...product, savedAt: Date.now() }, ...items];
    });
  }, []);

  const handleSearch = useCallback(async (overrideQuery) => {
    const q = overrideQuery || query;
    if (!q.trim() && activeChips.length === 0) return;
    setLoading(true);
    setError(null);
    setProducts([]);
    setDiscoverAngle(null);

    const msgs = ["Searching across stores...", "Finding the best matches...", "Almost there..."];
    let mi = 0;
    setLoadingMsg(msgs[0]);
    const msgInterval = setInterval(() => { mi = (mi + 1) % msgs.length; setLoadingMsg(msgs[mi]); }, 2000);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          chips: activeChips,
          tasteProfile: { ...tasteProfile, profile },
          locale,
          priceFilter,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setProducts(data.products || []);
    } catch(e) {
      setError(e.message);
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  }, [query, activeChips, tasteProfile]);

  const handleDiscover = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProducts([]);
    setQuery("");
    setDiscoverAngle(null);

    const msgs = ["Studying your taste...", "Discovering hidden gems...", "Curating just for you..."];
    let mi = 0;
    setLoadingMsg(msgs[0]);
    const msgInterval = setInterval(() => { mi = (mi + 1) % msgs.length; setLoadingMsg(msgs[mi]); }, 2000);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discover: true,
          chips: activeChips,
          tasteProfile: { ...tasteProfile, profile },
          locale,
          priceFilter,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discovery failed");
            setProducts(data.products || []);
      if (data.angle) setDiscoverAngle(data.angle);
    } catch(e) {
      setError(e.message);
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  }, [activeChips, tasteProfile]);

  const handleWorldExplore = async (country) => {
    setWorldCountry(country);
    setWorldProducts([]);
    setWorldError(null);
    setWorldAngle(null);
    setWorldLoading(true);
    try {
      const homeCurrency = locale.currency;
      const worldCurrency = WORLD_CURRENCY[country.code] || "USD";
      const stores = WORLD_STORES[country.code] || "";
      const p = profile || {};
      const profileHint = [
        p.vibes?.length ? p.vibes.join(", ") : "",
        p.interests || "",
        tasteProfile?.topCategories?.slice(0,3).join(", ") || "",
      ].filter(Boolean).join(", ");

      const res = await fetch(API_URL, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          worldMode: true,
          worldCountry: country.name,
          worldKnown: country.known,
          worldCurrency,
          homeCurrency,
          stores,
          profileHint,
          locale,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setWorldProducts(data.products || []);
      if (data.angle) setWorldAngle(data.angle);
    } catch(e) {
      setWorldError(e.message);
    } finally {
      setWorldLoading(false);
    }
  };

  const saveProfile = (answers) => {
    const merged = { ...profile, ...answers, updatedAt: Date.now() };
    setProfile(merged);
    localStorage.setItem("trove_profile", JSON.stringify(merged));
    localStorage.setItem("trove_profile_done", "1");
    setShowOnboarding(false);
    setShowOnboardingPrompt(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem("trove_profile_done", "1");
    setShowOnboarding(false);
    setShowOnboardingPrompt(false);
    setShowOnboardingPrompt(false);
  };

  const handleShareItem = (product) => {
    setShareItem(product);
    setShareItemCopied(false);
  };

  const handleCopyItem = () => {
    if (!shareItem) return;
    const msg = `Hey! Came across this and thought of you 😊

${shareItem.name}
${shareItem.price} · ${shareItem.store}

${shareItem.url}

(Found it on Trove)`;
    navigator.clipboard.writeText(msg).then(() => {
      setShareItemCopied(true);
      setTimeout(() => { setShareItemCopied(false); }, 2500);
    });
  };

  const handleShare = () => {
    const encoded = encodeStore(storeItems);
    if (!encoded) return;
    const url = `${window.location.origin}${window.location.pathname}?store=${encoded}`;
    const msg = `Here's what I've been into lately — my Trove 🔖

No pressure at all, just sharing in case you're ever curious about what I like!

${url}`;
    navigator.clipboard.writeText(msg).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    });
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* HEADER */}
        <div className="header">
          <div className="logo" onClick={() => setTab("discover")}>trove<span>.</span></div>
          <div className="header-actions">
            <button className={`icon-btn ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="scroll">

          {/* ── DISCOVER TAB ── */}
          {(tab === "discover" || tab === "search") && (
            <>
              <div className="discover-hero">
                <div className="discover-greeting">Your personal shopper</div>
                <div className="discover-title">
                  Find things you'll <span>love.</span>
                </div>
                <div className="discover-sub">
                  <button onClick={() => setShowCountryPicker(true)} style={{
                    background:"none", border:"none", cursor:"pointer", padding:0,
                    fontFamily:"DM Sans,sans-serif", textAlign:"left",
                    display:"inline-flex", alignItems:"center", gap:6, marginBottom:4,
                  }}>
                    <span style={{fontSize:18, lineHeight:1}}>{locale.flag}</span>
                    <strong style={{color:"var(--ink)", fontSize:13}}>{locale.name}</strong>
                    <span style={{fontSize:11, color:"var(--muted)"}}>· tap to change</span>
                  </button>
                  <div style={{fontSize:12, color:"var(--muted)"}}>
                    {tasteProfile?.scanCount > 0
                      ? `Based on ${tasteProfile.scanCount} scans`
                      : featuredStores.join(" · ")}
                  </div>
                </div>
                <div className="search-row">
                  <div className="search-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      placeholder={`e.g. ${searchPlaceholder}`}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <button className="search-btn" onClick={() => handleSearch()} disabled={loading}>
                    {loading ? "..." : "Search"}
                  </button>
                </div>
              </div>

              {/* Category chips */}
              <div className="taste-row">
                {DISCOVER_CHIPS.map(chip => (
                  <button key={chip} className={`taste-chip ${activeChips.includes(chip) ? "active" : ""}`}
                    onClick={() => toggleChip(chip)}>
                    {chip}
                  </button>
                ))}
              </div>

              {/* Discover button */}
              {/* Price filter */}
              <div className="price-filter-row">
                <span style={{fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)", display:"flex", alignItems:"center", paddingRight:4}}>Budget</span>
                {[
                  { label: "Under $50", val: 50 },
                  { label: "$50–$150", val: 150 },
                  { label: "$150–$300", val: 300 },
                  { label: "$300+", val: 999 },
                ].map(({ label, val }) => (
                  <button key={val}
                    className={`price-chip ${priceFilter === val ? "active" : ""}`}
                    onClick={() => setPriceFilter(p => p === val ? null : val)}>
                    {label}
                  </button>
                ))}
              </div>

              {!loading && products.length === 0 && !error && (
                <div className="empty-section">
                  <div className="empty-icon">✦</div>
                  <div className="empty-title">Discover your Trove</div>
                  <div className="empty-sub">
                    {tasteProfile?.scanCount > 0
                      ? "Let us surprise you with products picked from your taste profile — things you didn't know you needed."
                      : "Search for anything — gear, kitchen tools, fashion, handmade goods — or let us discover picks for you."}
                  </div>
                  <button className="search-btn" style={{marginTop:16, padding:"13px 28px", fontSize:14, borderRadius:12}}
                    onClick={handleDiscover} disabled={loading}>
                    ✦ Find something I'll love
                  </button>
                </div>
              )}
              {!loading && products.length === 0 && error && (
                <div className="empty-section">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-title">Nothing found</div>
                  <div className="empty-sub">
                    {error}
                    {query && <><br/><br/>Try a slightly broader term — e.g. "crampons" instead of "ice climbing crampons".</>}
                    {!query && <><br/><br/>Try selecting a category above or searching for something specific.</>}
                  </div>
                  <button className="search-btn" style={{marginTop:16, padding:"12px 24px", borderRadius:12, fontSize:13}}
                    onClick={() => query ? handleSearch() : handleDiscover()}>
                    Try again
                  </button>
                </div>
              )}

              {error && products.length > 0 && <div className="error-bar">{error}</div>}

              {loading && (
                <div className="loading-section">
                  <div className="loading-spinner" />
                  <div className="loading-label">{loadingMsg}</div>
                  <div className="loading-sub">Searching across curated stores</div>
                </div>
              )}

              {!loading && products.length > 0 && (
                <>
                  <div className="section-header" style={{marginTop: 8}}>
                    <div>
                      <div className="section-title">
                        {query ? `Results for "${query}"` : "Picked for you"}
                      </div>
                      {!query && discoverAngle && (
                        <div style={{fontSize:12, color:"var(--muted)", marginTop:3, fontStyle:"italic"}}>
                          {discoverAngle}
                        </div>
                      )}
                    </div>
                    <div className="section-sub">{products.length} finds</div>
                  </div>
                  <div className="products-grid">
                    {products.map((p, i) => (
                      <ProductCard key={i} product={p} index={i}
                        isSaved={isSaved(p)} onSave={toggleSave} onShare={handleShareItem} />
                    ))}
                  </div>
                  <div style={{padding:"20px", textAlign:"center"}}>
                    <button className="search-btn" style={{borderRadius:12, padding:"12px 24px"}}
                      onClick={() => query ? handleSearch() : handleDiscover()} disabled={loading}>
                      ↻ Find something else
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── MY STORE TAB ── */}
          {tab === "store" && (
            <>
              <div className="store-header">
                {isSharedView ? (
                  <>
                    <div style={{fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--muted)", marginBottom:6}}>Someone's Trove</div>
                    <div className="store-title">Their picks ✦</div>
                    <div className="store-sub">Tap any item to buy, or save it to your own store</div>
                  </>
                ) : (
                  <>
                    <div className="store-title">My Store</div>
                    <div className="store-sub">{userHandle} · {storeItems.length} picks saved</div>
                    {storeItems.length > 0 && (
                      <button className={`share-btn ${shareCopied ? "share-copied" : ""}`} onClick={handleShare}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        {shareCopied ? "✓ Message copied!" : "Share my Trove"}
                      </button>
                    )}
                  </>
                )}
              </div>

              {(() => {
                const displayItems = isSharedView ? sharedItems : storeItems;
                if (displayItems.length === 0) return (
                  <div className="empty-section">
                    <div className="empty-icon">🔖</div>
                    <div className="empty-title">Your store is empty</div>
                    <div className="empty-sub">Save products from Discover to build your personal store.</div>
                    <button className="search-btn" style={{marginTop:16, padding:"13px 28px", fontSize:14, borderRadius:12}}
                      onClick={() => setTab("discover")}>
                      Start discovering
                    </button>
                  </div>
                );
                return (
                  <>
                    <div className="section-header">
                      <div className="section-title">{isSharedView ? "Their picks" : "Your picks"}</div>
                      <div className="section-sub">{displayItems.length} items</div>
                    </div>
                    <div className="products-grid">
                      {displayItems.map((p, i) => (
                        <ProductCard key={i} product={p} index={i}
                          isSaved={!isSharedView && isSaved(p)}
                          onSave={toggleSave} />
                      ))}
                    </div>
                    {isSharedView && (
                      <div style={{padding:"16px 20px 8px", textAlign:"center"}}>
                        <button className="search-btn" style={{borderRadius:12, padding:"12px 24px", fontSize:13}}
                          onClick={() => { window.location.href = window.location.pathname; }}>
                          ✦ Open your own Trove
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <div className="profile-section">
              <div className="section-header" style={{padding:"20px 0 16px"}}>
                <div className="section-title">Your taste profile</div>
              </div>

              {/* Edit profile button */}
              <button onClick={() => { setOnboardingStep(0); setShowOnboarding(true); setShowOnboardingPrompt(false); }}
                style={{
                  display:"flex", alignItems:"center", gap:8,
                  background:"var(--warm-white)", border:"1.5px solid var(--border2)",
                  borderRadius:10, padding:"10px 16px", marginBottom:12,
                  fontFamily:"DM Sans,sans-serif", fontSize:13, fontWeight:700,
                  color:"var(--ink2)", cursor:"pointer", width:"100%"
                }}>
                ✏️ Edit my taste profile
              </button>

              {profile.vibes?.length > 0 && (
                <div className="profile-card">
                  <div className="profile-card-title">My vibes</div>
                  <div className="taste-grid">
                    {profile.vibes.map((v,i) => <div key={i} className="taste-pill active">{v}</div>)}
                  </div>
                </div>
              )}

              {profile.budget && (
                <div className="profile-card">
                  <div className="profile-card-title">Shopping style</div>
                  <div style={{fontSize:14, fontWeight:600, color:"var(--ink)"}}>{profile.budget}</div>
                </div>
              )}

              {profile.interests && (
                <div className="profile-card">
                  <div className="profile-card-title">Into lately</div>
                  <div style={{fontSize:13, color:"var(--ink2)", lineHeight:1.6}}>{profile.interests}</div>
                </div>
              )}

              {profile.avoid && (
                <div className="profile-card">
                  <div className="profile-card-title">Never show me</div>
                  <div style={{fontSize:13, color:"var(--ink2)", lineHeight:1.6}}>{profile.avoid}</div>
                </div>
              )}

              <div className="profile-card">
                <div className="profile-card-title">Stats</div>
                {scanHistory.length === 0 ? (
                  <div className="profile-empty">No scans yet — your profile builds automatically as you use ScanRate.</div>
                ) : (
                  <>
                    <div className="profile-stat">
                      <span className="profile-stat-label">Products scanned</span>
                      <span className="profile-stat-val">{tasteProfile?.scanCount || 0}</span>
                    </div>
                    <div className="profile-stat">
                      <span className="profile-stat-label">Items you liked</span>
                      <span className="profile-stat-val">{tasteProfile?.likedCount || 0}</span>
                    </div>
                    <div className="profile-stat">
                      <span className="profile-stat-label">Saved to wishlist</span>
                      <span className="profile-stat-val">{scanHistory.filter(h => h.reaction === "saved").length}</span>
                    </div>
                  </>
                )}
              </div>

              {tasteProfile?.topCategories?.length > 0 && (
                <div className="profile-card">
                  <div className="profile-card-title">Categories you explore</div>
                  <div className="taste-grid">
                    {tasteProfile.topCategories.map((c, i) => (
                      <div key={i} className="taste-pill active">{c}</div>
                    ))}
                  </div>
                </div>
              )}

              {tasteProfile?.topTags?.length > 0 && (
                <div className="profile-card">
                  <div className="profile-card-title">What you look for</div>
                  <div className="taste-grid">
                    {tasteProfile.topTags.map((t, i) => (
                      <div key={i} className="taste-pill active">{t}</div>
                    ))}
                  </div>
                </div>
              )}

              {scanHistory.length === 0 && (
                <div className="profile-card" style={{textAlign:"center", padding:"32px 20px"}}>
                  <div style={{fontSize:36, marginBottom:12}}>📱</div>
                  <div style={{fontFamily:"'Playfair Display',serif", fontSize:16, marginBottom:6}}>
                    Open ScanRate to get started
                  </div>
                  <div style={{fontSize:12, color:"var(--muted)", lineHeight:1.6}}>
                    Your taste profile builds automatically as you scan products and react to them. Trove uses that data to find things you'll love.
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* COUNTRY PICKER */}
        {showCountryPicker && (
          <div className="modal-overlay" onClick={() => setShowCountryPicker(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="modal-handle" />
              <div className="modal-title" style={{marginBottom:16}}>Shop in a different country</div>
              <div className="country-picker-list">
                {COUNTRIES.map(c => (
                  <button key={c.code} className={`country-option ${localeCode === c.code ? "active" : ""}`}
                    onClick={() => switchCountry(c.code)}>
                    <span className="country-flag">{c.flag}</span>
                    <span className="country-name">{c.name}</span>
                    <span className="country-currency">{c.currency}</span>
                    {localeCode === c.code && <span style={{color:"var(--gold)", fontSize:14}}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ONBOARDING PROMPT */}
        {showOnboardingPrompt && !showOnboarding && (
          <div className="onboarding-prompt" onClick={() => setShowOnboardingPrompt(false)}>
            <div className="onboarding-prompt-sheet" onClick={e => e.stopPropagation()}>
              <div className="modal-handle" style={{margin:"12px auto 16px"}} />
              <div className="onboarding-prompt-icon">✦</div>
              <div className="onboarding-prompt-title">Get picks made for you</div>
              <div className="onboarding-prompt-sub">
                Answer 4 quick questions and Trove will find things you'll actually love — not just popular items. Takes under a minute.
              </div>
              <button className="onboarding-btn onboarding-btn-primary" style={{marginBottom:10}}
                onClick={() => { setShowOnboardingPrompt(false); setShowOnboarding(true); }}>
                ✦ Personalise my Trove
              </button>
              <button className="onboarding-btn onboarding-btn-skip" onClick={skipOnboarding}>
                No thanks, I'll just search
              </button>
            </div>
          </div>
        )}

        {/* ONBOARDING */}
        {showOnboarding && (() => {
          const step = ONBOARDING_STEPS[onboardingStep];
          const isLast = onboardingStep === ONBOARDING_STEPS.length - 1;
          const canNext = step.type === "vibes" ? onboardingAnswers.vibes.length > 0
            : step.type === "budget" ? !!onboardingAnswers.budget
            : true;

          const handleNext = () => {
            if (isLast) {
              saveProfile(onboardingAnswers);
            } else {
              setOnboardingStep(s => s + 1);
            }
          };

          return (
            <div className="onboarding-overlay">
              <div className="onboarding-header">
                <div className="onboarding-progress">
                  {ONBOARDING_STEPS.map((_, i) => (
                    <div key={i} className={`onboarding-progress-dot ${i <= onboardingStep ? "done" : ""}`} />
                  ))}
                </div>
                <div className="onboarding-question">{step.question}</div>
                <div className="onboarding-sub">{step.sub}</div>
              </div>

              <div className="onboarding-body">
                {step.type === "vibes" && (
                  <div className="vibe-cloud">
                    {VIBES.map(v => (
                      <button key={v.label}
                        className={`vibe-btn ${onboardingAnswers.vibes.includes(v.label) ? "active" : ""}`}
                        onClick={() => setOnboardingAnswers(a => ({
                          ...a,
                          vibes: a.vibes.includes(v.label)
                            ? a.vibes.filter(x => x !== v.label)
                            : [...a.vibes, v.label]
                        }))}>
                        <span className="vibe-emoji">{v.emoji}</span>
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}

                {step.type === "budget" && (
                  <div className="budget-list">
                    {BUDGET_STYLES.map(b => (
                      <button key={b.label}
                        className={`budget-btn ${onboardingAnswers.budget === b.label ? "active" : ""}`}
                        onClick={() => setOnboardingAnswers(a => ({ ...a, budget: b.label }))}>
                        <span className="budget-emoji">{b.emoji}</span>
                        <div>
                          <div className="budget-label">{b.label}</div>
                          <div className="budget-sub">{b.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {step.type === "text" && (
                  <textarea className="onboarding-input" rows={4}
                    placeholder={step.placeholder}
                    value={onboardingAnswers[step.id] || ""}
                    onChange={e => setOnboardingAnswers(a => ({ ...a, [step.id]: e.target.value }))}
                  />
                )}
              </div>

              <div className="onboarding-footer">
                <button className="onboarding-btn onboarding-btn-primary"
                  onClick={handleNext} disabled={!canNext && step.type !== "text"}>
                  {isLast ? "✦ Start discovering" : "Continue →"}
                </button>
                <button className="onboarding-btn onboarding-btn-skip" onClick={skipOnboarding}>
                  {onboardingStep === 0 ? "Skip — just show me Trove" : "Skip this question"}
                </button>
              </div>
            </div>
          );
        })()}

        {/* SHARE ITEM MODAL */}
        {shareItem && (
          <div className="modal-overlay" onClick={() => setShareItem(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="modal-handle" />
              <div className="modal-title">Send to a friend 💌</div>
              <div className="modal-sub">
                Thought someone would love this? Share it with them — no strings attached.
              </div>
              <div className="modal-preview">
                <div className="modal-preview-name">{shareItem.name}</div>
                <div className="modal-preview-meta">{shareItem.price} · {shareItem.store}</div>
              </div>
              <div className="modal-msg">
                "Hey! Came across this and thought of you 😊"
              </div>
              <button className={`modal-btn modal-btn-primary ${shareItemCopied ? "copied" : ""}`}
                onClick={handleCopyItem}>
                {shareItemCopied ? "✓ Copied! Go paste it in a message" : "📋 Copy message + link"}
              </button>
              <button className="modal-btn modal-btn-secondary" onClick={() => setShareItem(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* WORLD TAB */}
        {tab === "world" && (
          <div className="tab-content">
            {!worldCountry ? (
              <>
                <div className="world-header">
                  <div className="world-title">Shop the World</div>
                  <div className="world-sub">Pick a country and Trove finds what it does best — matched to your taste.</div>
                </div>
                <button className="world-surprise" onClick={() => {
                  const rand = WORLD_COUNTRIES[Math.floor(Math.random()*WORLD_COUNTRIES.length)];
                  handleWorldExplore(rand);
                }}>
                  <span style={{fontSize:28}}>✦</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--ink)"}}>Surprise me</div>
                    <div style={{fontSize:12,color:"var(--muted)"}}>Let Trove pick a country for you</div>
                  </div>
                </button>
                <div className="world-grid">
                  {WORLD_COUNTRIES.map(c => (
                    <button key={c.code} className="world-card" onClick={() => handleWorldExplore(c)}>
                      <div className="world-card-flag">{c.flag}</div>
                      <div className="world-card-name">{c.name}</div>
                      <div className="world-card-known">{c.known}</div>
                      <div className="world-card-vibe">{c.vibe}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="world-results-header">
                  <button className="world-back" onClick={() => { setWorldCountry(null); setWorldProducts([]); }}>
                    ← Back
                  </button>
                  <span style={{fontSize:24}}>{worldCountry.flag}</span>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--ink)"}}>{worldCountry.name}</div>
                    {worldAngle && <div style={{fontSize:12,color:"var(--muted)",fontStyle:"italic"}}>{worldAngle}</div>}
                  </div>
                </div>
                {worldLoading && (
                  <div style={{padding:"40px 20px",textAlign:"center",color:"var(--muted)",fontSize:13}}>
                    <div style={{fontSize:32,marginBottom:12}}>{worldCountry.flag}</div>
                    Exploring {worldCountry.name}...
                  </div>
                )}
                {worldError && (
                  <div className="empty-section">
                    <div className="empty-icon">🌍</div>
                    <div className="empty-title">Couldn't load picks</div>
                    <div className="empty-sub">{worldError}</div>
                    <button className="search-btn" style={{marginTop:16,borderRadius:12,padding:"12px 24px",fontSize:13}}
                      onClick={() => handleWorldExplore(worldCountry)}>Try again</button>
                  </div>
                )}
                {!worldLoading && worldProducts.length > 0 && (
                  <div style={{padding:"0 16px 100px"}}>
                    <div className="products-grid">
                      {worldProducts.map((p,i) => (
                        <ProductCard key={i} product={p} index={i}
                          isSaved={isSaved(p)} onSave={toggleSave} onShare={handleShareItem} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* NAV */}
        <div className="nav">
          <button className={`nav-btn ${tab === "discover" ? "active" : ""}`} onClick={() => setTab("discover")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Discover
          </button>
          <button className={`nav-btn ${tab === "store" ? "active" : ""}`} onClick={() => setTab("store")} style={{position:"relative"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            My Store
            {storeItems.length > 0 && <div className="nav-dot" />}
          </button>
          <button className={`nav-btn ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profile
          </button>
        </div>

      </div>
    </>
  );
}
