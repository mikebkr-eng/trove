import { useState, useCallback, useEffect, useRef } from "react";

const API_URL = "/api/trove";

function getLocale() {
  const lang = navigator.language || "en-CA";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  // Map timezone to country + currency
  const map = {
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
  const currencyMap = {
    "CA":"CAD","US":"USD","GB":"GBP","FR":"EUR","DE":"EUR","NL":"EUR",
    "ES":"EUR","IT":"EUR","AU":"AUD","NZ":"NZD","JP":"JPY","KR":"KRW",
    "SG":"SGD","HK":"HKD",
  };
  const countryCode = map[tz] || (lang.includes("-") ? lang.split("-")[1] : "CA");
  const currency = currencyMap[countryCode] || "CAD";
  const countryNames = {
    "CA":"Canada","US":"United States","GB":"United Kingdom","FR":"France",
    "DE":"Germany","AU":"Australia","NZ":"New Zealand","JP":"Japan",
    "KR":"South Korea","SG":"Singapore","NL":"Netherlands","ES":"Spain","IT":"Italy",
  };
  return { countryCode, currency, country: countryNames[countryCode] || "Canada", tz };
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
  .products-grid { padding: 0 20px; display: flex; flex-direction: column; gap: 12px; }
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
  .product-card-body { padding: 16px; }
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

const DISCOVER_CHIPS = [
  "Outdoor & Gear", "Kitchen & Home", "Sustainable", "Handmade & Artisan",
  "Tech & Gadgets", "Fashion & Style", "Health & Wellness", "Books & Learning"
];

// ── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, isSaved, onSave, index }) {
  return (
    <div className="product-card" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="product-card-body">
        <div className="product-store-row">
          <div className="product-store">
            <div className="store-dot" />
            {product.store}
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
  const [tab, setTab] = useState("discover");
  const locale = getLocale();
  const [query, setQuery] = useState("");
  const [activeChips, setActiveChips] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Finding products...");
  const [error, setError] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);

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
          tasteProfile,
          locale,
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
          tasteProfile,
          locale,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discovery failed");
      setProducts(data.products || []);
    } catch(e) {
      setError(e.message);
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  }, [activeChips, tasteProfile]);

  const handleShare = () => {
    const shareText = `Check out my Trove picks!\n\n${storeItems.slice(0,5).map(p => `• ${p.name} — ${p.price} (${p.store})\n  ${p.url}`).join("\n\n")}`;
    navigator.clipboard.writeText(shareText).then(() => {
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
                  {tasteProfile?.scanCount > 0
                    ? `Based on ${tasteProfile.scanCount} scans · Shopping in ${locale.country}`
                    : `Shopping in ${locale.country} · Etsy, REI, Patagonia, kitchen stores and more`}
                </div>
                <div className="search-row">
                  <div className="search-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      placeholder="e.g. cozy winter jacket under $150..."
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
              {!loading && products.length === 0 && !error && (
                <div className="empty-section">
                  <div className="empty-icon">✦</div>
                  <div className="empty-title">Discover your Trove</div>
                  <div className="empty-sub">
                    {tasteProfile?.scanCount > 0
                      ? "Let us surprise you with products picked from your taste profile — things you didn't know you needed."
                      : "Search for something specific, or let us discover products you'll love based on your interests."}
                  </div>
                  <button className="search-btn" style={{marginTop:16, padding:"13px 28px", fontSize:14, borderRadius:12}}
                    onClick={handleDiscover} disabled={loading}>
                    ✦ Discover for me
                  </button>
                </div>
              )}

              {error && <div className="error-bar">{error}</div>}

              {loading && (
                <div className="loading-section">
                  <div className="loading-spinner" />
                  <div className="loading-label">{loadingMsg}</div>
                  <div className="loading-sub">Searching across curated stores</div>
                </div>
              )}

              {!loading && products.length > 0 && (
                <>
                  <div className="section-header">
                    <div className="section-title">
                      {query ? `Results for "${query}"` : "Picked for you"}
                    </div>
                    <div className="section-sub">{products.length} finds</div>
                  </div>
                  <div className="products-grid">
                    {products.map((p, i) => (
                      <ProductCard key={i} product={p} index={i}
                        isSaved={isSaved(p)} onSave={toggleSave} />
                    ))}
                  </div>
                  <div style={{padding:"20px", textAlign:"center"}}>
                    <button className="search-btn" style={{borderRadius:12, padding:"12px 24px"}}
                      onClick={() => query ? handleSearch() : handleDiscover()} disabled={loading}>
                      ↻ Refresh picks
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
                <div className="store-title">My Store</div>
                <div className="store-sub">Your saved picks — share with friends</div>
                {storeItems.length > 0 && (
                  <button className={`share-btn ${shareCopied ? "share-copied" : ""}`} onClick={handleShare}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    {shareCopied ? "Copied to clipboard!" : "Share my store"}
                  </button>
                )}
              </div>

              {storeItems.length === 0 ? (
                <div className="empty-section">
                  <div className="empty-icon">🔖</div>
                  <div className="empty-title">Your store is empty</div>
                  <div className="empty-sub">Save products from Discover to build your personal store.</div>
                  <button className="search-btn" style={{marginTop:16, padding:"13px 28px", fontSize:14, borderRadius:12}}
                    onClick={() => setTab("discover")}>
                    Start discovering
                  </button>
                </div>
              ) : (
                <>
                  <div className="section-header">
                    <div className="section-title">Your picks</div>
                    <div className="section-sub">{storeItems.length} saved</div>
                  </div>
                  <div className="products-grid">
                    {storeItems.map((p, i) => (
                      <ProductCard key={i} product={p} index={i}
                        isSaved={true} onSave={toggleSave} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <div className="profile-section">
              <div className="section-header" style={{padding:"20px 0 16px"}}>
                <div className="section-title">Your taste profile</div>
              </div>

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
